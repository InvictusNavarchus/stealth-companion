import { botLogger } from "../../logger.js";
import { loadMessages, saveMessages } from "../services/messageStorage.js";
import { handleMediaMessage, getMediaFileExtension } from "../services/mediaHandler.js";
import { shouldStoreImage } from "../config/imageConfig.js";

/**
 * Converts megabytes to bytes
 * @param {number} mb - Size in megabytes
 * @returns {number} Size in bytes
 */
const mbToBytes = (mb) => mb * 1024 * 1024;

/**
 * Configuration for different media types
 */
const MEDIA_CONFIG = {
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
	}
};

/**
 * Detects if a message contains media content that should be stored
 * @param {Object} ctx - The message context from Zaileys
 * @returns {boolean} True if media content should be stored
 */
export function detectMediaContent(ctx) {
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
		const mediaType = ctx.chatType;
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
			} else if (ctx.media.fileLength.low !== undefined) {
				// Handle Long integer type (common in WhatsApp libraries)
				fileSize = ctx.media.fileLength.low + (ctx.media.fileLength.high || 0) * 0x100000000;
			} else {
				fileSize = Number(ctx.media.fileLength);
			}

			if (fileSize > config.maxSize) {
				botLogger.debug(`Media file too large: ${fileSize} > ${config.maxSize}`);
				return false;
			}
		}

		// Check format - handle mimetypes with additional parameters (e.g., "audio/ogg; codecs=opus")
		if (ctx.media.mimetype && config.formats.length > 0) {
			const baseMimetype = ctx.media.mimetype.split(';')[0].trim();
			if (!config.formats.includes(baseMimetype)) {
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
			error: error.message,
			chatId: ctx.chatId,
			chatType: ctx.chatType
		});
		return false;
	}
}

/**
 * Processes and stores a media message
 * @param {Object} ctx - The message context from Zaileys
 */
export async function storeMediaMessage(ctx) {
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
			const mediaData = {
				// Main message metadata
				chatId: ctx.chatId,
				channelId: ctx.channelId,
				uniqueId: ctx.uniqueId,
				roomId: ctx.roomId,
				roomName: ctx.roomName,
				senderId: ctx.senderId,
				senderName: ctx.senderName,
				senderDevice: ctx.senderDevice,
				timestamp: ctx.timestamp,
				text: ctx.text || '',
				isFromMe: ctx.isFromMe,
				isGroup: ctx.isGroup,
				
				// Media specific data
				chatType: ctx.chatType,
				hasMedia: true,
				mediaPath: mediaPath,
				mediaType: ctx.chatType,
				
				// Media metadata
				media: {
					mimetype: ctx.media.mimetype,
					caption: ctx.media.caption,
					height: ctx.media.height,
					width: ctx.media.width,
					fileLength: ctx.media.fileLength,
					duration: ctx.media.duration, // For audio/video
					pages: ctx.media.pages, // For documents
					fileName: ctx.media.fileName // For documents
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
			error: error.message,
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			roomName: ctx.roomName,
			mediaType: ctx.chatType,
			stack: error.stack
		});
	}
}

/**
 * Handles incoming media messages
 * @param {Object} ctx - The message context from Zaileys
 * @param {Object} client - The WhatsApp client instance
 */
export async function handleMediaMessageWrapper(ctx, client) {
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
export async function getMediaStorageStats() {
	try {
		const messages = await loadMessages();
		const stats = {
			total: messages.length,
			byType: {},
			byRoom: {},
			totalSize: 0
		};

		messages.forEach(msg => {
			// Count by content type
			const contentType = msg.contentType || 'unknown';
			stats.byType[contentType] = (stats.byType[contentType] || 0) + 1;

			// Count by room
			const roomName = msg.roomName || 'unknown';
			stats.byRoom[roomName] = (stats.byRoom[roomName] || 0) + 1;

			// Sum file sizes (if available)
			if (msg.media?.fileLength) {
				stats.totalSize += msg.media.fileLength;
			}
		});

		return stats;
	} catch (error) {
		botLogger.error("Error getting media storage stats", { error: error.message });
		return { total: 0, byType: {}, byRoom: {}, totalSize: 0 };
	}
}
