import { botLogger } from "../../logger.js";
import { loadMessages, saveMessages } from "../services/messageStorage.js";
import { handleImageMessage } from "../services/mediaHandler.js";
import { shouldStoreImage } from "../config/imageConfig.js";
import { MessageContext } from "../../types/index.js";

/**
 * Detects if a message contains regular image content (not view-once or story)
 * @param {Object} ctx - The message context from Zaileys
 * @returns {boolean} True if regular image content is detected, false otherwise
 */
export function detectRegularImageContent(ctx: MessageContext): boolean {
	try {
		// Check if it's an image message with media
		const isImage = ctx.chatType === 'image' && ctx.media;
		
		// Exclude view-once images (they're handled separately)
		const isNotViewOnce = !ctx.isViewOnce && !ctx.media?.viewOnce;
		
		// Exclude stories (they're handled separately)
		const isNotStory = !ctx.isStory;
		
		// Exclude forwarded view-once content
		const isNotViewOnceForward = ctx.chatType !== 'viewOnce';
		
		// Check configuration filters
		const passesFilters = shouldStoreImage(ctx);
		
		const shouldProcess = isImage && isNotViewOnce && isNotStory && isNotViewOnceForward && passesFilters;
		
		botLogger.debug("Regular image detection", {
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			chatType: ctx.chatType,
			isImage,
			isNotViewOnce,
			isNotStory,
			passesFilters,
			shouldProcess
		});
		
		return shouldProcess;
	} catch (error) {
		botLogger.error("Error in regular image detection", {
			error: (error as Error).message,
			chatId: ctx.chatId,
			chatType: ctx.chatType
		});
		return false;
	}
}

/**
 * Processes and stores a regular image message
 * @param {Object} ctx - The message context from Zaileys
 */
export async function storeRegularImage(ctx: MessageContext): Promise<void> {
	try {
		botLogger.processing("Processing regular image message", {
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			roomName: ctx.roomName,
			senderName: ctx.senderName,
			hasMedia: !!ctx.media
		});

		// Handle image saving using existing infrastructure
		const imagePath = await handleImageMessage(ctx);
		
		if (imagePath) {
			// Load existing messages for storage
			botLogger.database("Loading existing messages for image update");
			const messages = await loadMessages();
			
			// Create image message object
			const imageData = {
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
				
				// Image specific data
				chatType: ctx.chatType,
				hasMedia: true,
				imagePath: imagePath,
				
				// Media metadata
				media: ctx.media ? {
					mimetype: ctx.media.mimetype,
					caption: ctx.media.caption,
					height: ctx.media.height,
					width: ctx.media.width,
					fileLength: ctx.media.fileLength
				} : null,
				
				// Processing metadata
				processedAt: new Date().toISOString(),
				contentType: 'regular_image',
				
				// Room/sender context
				roomContext: {
					roomId: ctx.roomId,
					roomName: ctx.roomName,
					isGroup: ctx.isGroup,
					senderName: ctx.senderName
				}
			};
			
			// Add image to messages array and save
			messages.push(imageData);
			await saveMessages(messages);
			
			botLogger.success("Regular image stored successfully", {
				totalMessages: messages.length,
				roomName: ctx.roomName,
				senderName: ctx.senderName,
				imagePath: imagePath
			});
		} else {
			botLogger.warning("Failed to save image file, skipping message storage");
		}
	} catch (error) {
		botLogger.error("Error storing regular image", {
			error: (error as Error).message,
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			roomName: ctx.roomName,
			stack: (error as Error).stack
		});
	}
}

/**
 * Handles incoming regular image messages
 * @param {Object} ctx - The message context from Zaileys
 * @param {Object} _client - The WhatsApp client instance (unused)
 */
export async function handleRegularImageMessage(ctx: MessageContext, _client?: any): Promise<void> {
	botLogger.messageReceived("Regular image message received", {
		chatId: ctx.chatId,
		roomId: ctx.roomId,
		roomName: ctx.roomName,
		senderName: ctx.senderName,
		mediaType: ctx.chatType,
		hasCaption: !!ctx.text,
		caption: ctx.text || ''
	});

	// Process and store the regular image
	if (detectRegularImageContent(ctx)) {
		await storeRegularImage(ctx);
	} else {
		botLogger.debug("Image message does not meet regular image criteria, skipping");
	}
}
