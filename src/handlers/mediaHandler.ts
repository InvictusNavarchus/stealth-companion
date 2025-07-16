import { botLogger } from "../../logger.js";
import { loadMessages, saveMessages } from "../services/messageStorage.js";
import { handleMediaMessage } from "../services/mediaHandler.js";
import { shouldStoreImage } from "../config/imageConfig.js";
import { MessageContext, StoredMediaMessage, SupportedMediaType, AnyStoredMessage, StoredMessage } from "../../types/index.js";

// Type guards
function isStoredMessage(msg: AnyStoredMessage): msg is StoredMessage {
	return 'originalMessage' in msg;
}

/**
 * Converts megabytes to bytes
 * @param {number} mb - Size in megabytes
 * @returns {number} Size in bytes
 */
const mbToBytes = (mb: number): number => mb * 1024 * 1024;

/**
 * Configuration for different media types
 */
interface MediaConfig {
	enabled: boolean;
	maxSize: number;
	formats: string[];
}

const MEDIA_CONFIG: Record<SupportedMediaType, MediaConfig> = {
	image: {
		enabled: true,
		maxSize: mbToBytes(50),
		formats: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
	},
	video: {
		enabled: true,
		maxSize: mbToBytes(100),
		formats: ['video/mp4', 'video/avi', 'video/mov', 'video/mkv']
	},
	audio: {
		enabled: true,
		maxSize: mbToBytes(50),
		formats: ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/m4a']
	},
	voice: {
		enabled: true,
		maxSize: mbToBytes(50),
		formats: ['audio/ogg', 'audio/mp4', 'audio/mpeg']
	},
	document: {
		enabled: true,
		maxSize: mbToBytes(50),
		formats: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
	},
	sticker: {
		enabled: true,
		maxSize: mbToBytes(10),
		formats: ['image/webp', 'image/png', 'image/jpeg']
	}
};

/**
 * Detects if a message contains media content that should be stored
 * @param {MessageContext} ctx - The message context from Zaileys
 * @returns {boolean} True if media content should be stored
 */
export function detectMediaContent(ctx: MessageContext): boolean {
	try {
		// Check if message has media
		if (!ctx.media || !ctx.chatType) {
			return false;
		}

		// Exclude view-once and stories (handled separately)
		if (ctx.isViewOnce || ctx.media?.viewOnce || ctx.isStory || ctx.chatType === 'viewOnce') {
			return false;
		}

		// Check if media type is supported
		const mediaType = ctx.chatType as SupportedMediaType;
		const config = MEDIA_CONFIG[mediaType];
		
		if (!config || !config.enabled) {
			botLogger.debug(`Media type ${mediaType} is not enabled for storage`);
			return false;
		}

		// Check file size - handle both number and Long integer types
		let fileSize = 0;
		if (ctx.media.fileLength) {
			if (typeof ctx.media.fileLength === 'number') {
				fileSize = ctx.media.fileLength;
			} else {
				fileSize = Number(ctx.media.fileLength);
			}

			if (fileSize > config.maxSize) {
				botLogger.debug(`Media file too large: ${fileSize} > ${config.maxSize}`);
				return false;
			}
		}

		// Check format - handle mimetypes with additional parameters (e.g., "audio/ogg; codecs=opus")
		if (ctx.media?.mimetype && config.formats.length > 0) {
			const baseMimetype = ctx.media.mimetype?.split(';')[0]?.trim();
			if (baseMimetype && !config.formats.includes(baseMimetype)) {
				botLogger.debug(`Media format not supported: ${ctx.media.mimetype} (base: ${baseMimetype})`);
				return false;
			}
		}

		// For images, also check the image-specific filters
		if (mediaType === 'image') {
			return shouldStoreImage(ctx);
		}

		botLogger.debug("Media content detection passed", {
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			mediaType,
			mimetype: ctx.media.mimetype,
			fileSize: ctx.media.fileLength
		});

		return true;
	} catch (error) {
		botLogger.error("Error in media content detection", {
			error: error instanceof Error ? error.message : String(error),
			chatId: ctx.chatId,
			chatType: ctx.chatType
		});
		return false;
	}
}

/**
 * Processes and stores a media message
 * @param {MessageContext} ctx - The message context from Zaileys
 */
export async function storeMediaMessage(ctx: MessageContext): Promise<void> {
	try {
		botLogger.processing(`Processing ${ctx.chatType} message`, {
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			roomName: ctx.roomName,
			senderName: ctx.senderName,
			mediaType: ctx.chatType,
			hasMedia: !!ctx.media
		});

		// Handle media saving using enhanced infrastructure
		const mediaPath = await handleMediaMessage(ctx);
		
		if (mediaPath) {
			// Load existing messages for storage
			botLogger.database(`Loading existing messages for ${ctx.chatType} update`);
			const messages = await loadMessages();
			
			// Create media message object
			const mediaData: StoredMediaMessage = {
				// Main message metadata
				chatId: ctx.chatId,
				...(ctx.channelId && { channelId: ctx.channelId }),
				...(ctx.uniqueId && { uniqueId: ctx.uniqueId }),
				roomId: ctx.roomId,
				roomName: ctx.roomName,
				senderId: ctx.senderId,
				senderName: ctx.senderName,
				...(ctx.senderDevice && { senderDevice: ctx.senderDevice }),
				timestamp: ctx.timestamp,
				...(ctx.text && { text: ctx.text }),
				...(ctx.isFromMe !== undefined && { isFromMe: ctx.isFromMe }),
				isGroup: ctx.isGroup,
				
				// Media specific data
				chatType: ctx.chatType,
				hasMedia: true,
				mediaPath: mediaPath,
				mediaType: ctx.chatType,
				
				// Media metadata
				media: {
					mimetype: ctx.media?.mimetype || '',
					...(ctx.media?.caption && { caption: ctx.media.caption }),
					...(ctx.media?.height && { height: ctx.media.height }),
					...(ctx.media?.width && { width: ctx.media.width }),
					...(ctx.media?.fileLength && { fileLength: ctx.media.fileLength }),
					...(ctx.media?.duration && { duration: ctx.media.duration }),
					...(ctx.media?.pages && { pages: ctx.media.pages }),
					...(ctx.media?.fileName && { fileName: ctx.media.fileName }),
					...(ctx.media?.viewOnce !== undefined && { viewOnce: ctx.media.viewOnce })
				},
				
				// Processing metadata
				processedAt: new Date().toISOString(),
				contentType: `regular_${ctx.chatType}`,
				
				// Room/sender context
				roomContext: {
					roomId: ctx.roomId,
					roomName: ctx.roomName,
					isGroup: ctx.isGroup,
					senderName: ctx.senderName
				}
			};
			
			// Add media to messages array and save
			messages.push(mediaData);
			await saveMessages(messages);
			
			botLogger.success(`${ctx.chatType} stored successfully`, {
				totalMessages: messages.length,
				roomName: ctx.roomName,
				senderName: ctx.senderName,
				mediaPath: mediaPath,
				mediaType: ctx.chatType
			});
		} else {
			botLogger.warning(`Failed to save ${ctx.chatType} file, skipping message storage`);
		}
	} catch (error) {
		botLogger.error(`Error storing ${ctx.chatType}`, {
			error: error instanceof Error ? error.message : String(error),
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			roomName: ctx.roomName,
			mediaType: ctx.chatType,
			stack: error instanceof Error ? error.stack : undefined
		});
	}
}

/**
 * Handles incoming media messages
 * @param {Object} ctx - The message context from Zaileys
 * @param {Object} client - The WhatsApp client instance
 */
/**
 * Wrapper function for handling media messages
 * @param {MessageContext} ctx - The message context from Zaileys
 * @param {any} _client - The client instance (unused)
 */
export async function handleMediaMessageWrapper(ctx: MessageContext, _client: any): Promise<void> {
	botLogger.messageReceived(`${ctx.chatType} message received`, {
		chatId: ctx.chatId,
		roomId: ctx.roomId,
		roomName: ctx.roomName,
		senderName: ctx.senderName,
		mediaType: ctx.chatType,
		hasCaption: !!ctx.text,
		caption: ctx.text || '',
		fileSize: ctx.media?.fileLength || 0
	});

	// Process and store the media
	if (detectMediaContent(ctx)) {
		await storeMediaMessage(ctx);
	} else {
		botLogger.debug(`${ctx.chatType} message does not meet storage criteria, skipping`);
	}
}

/**
 * Get media storage statistics
 * @returns {Object} Statistics about stored media
 */
export async function getMediaStorageStats(): Promise<{
	total: number;
	byType: Record<string, number>;
	byRoom: Record<string, number>;
	totalSize: number;
}> {
	try {
		const messages = await loadMessages();
		const stats = {
			total: messages.length,
			byType: {} as Record<string, number>,
			byRoom: {} as Record<string, number>,
			totalSize: 0
		};

		messages.forEach(msg => {
			// Count by content type (only for stored media messages)
			if ('contentType' in msg) {
				const contentType = msg.contentType || 'unknown';
				stats.byType[contentType] = (stats.byType[contentType] || 0) + 1;
			}
		// Count by room - handle different message structures
		let roomName = 'unknown';
		if (isStoredMessage(msg) && msg.originalMessage?.roomName) {
			roomName = msg.originalMessage.roomName;
		} else if (msg.roomName) {
			roomName = msg.roomName;
		}
		stats.byRoom[roomName] = (stats.byRoom[roomName] || 0) + 1;

			// Sum file sizes (only for stored media messages)
			if ('media' in msg && msg.media?.fileLength) {
				stats.totalSize += msg.media.fileLength;
			}
		});

		return stats;
	} catch (error) {
		botLogger.error("Error getting media storage stats", { 
			error: error instanceof Error ? error.message : String(error) 
		});
		return { total: 0, byType: {}, byRoom: {}, totalSize: 0 };
	}
}
