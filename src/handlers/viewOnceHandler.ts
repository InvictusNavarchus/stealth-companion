import { botLogger } from "../../logger.js";
import { saveViewOnceMedia, getMediaFileExtension } from "../services/mediaHandler.js";

/**
 * Determines the media type from context and mimetype
 * @param {Object} replied - The replied message context
 * @returns {string} The media type (image, video, audio)
 */
function getViewOnceMediaType(replied) {
	// First check chatType if available
	if (replied.chatType) {
		const chatType = replied.chatType.toLowerCase();
		if (['image', 'video', 'audio', 'voice'].includes(chatType)) {
			return chatType === 'voice' ? 'audio' : chatType;
		}
	}

	// Fallback to mimetype analysis
	if (replied.media?.mimetype) {
		const mimetype = replied.media.mimetype.toLowerCase();
		if (mimetype.startsWith('image/')) return 'image';
		if (mimetype.startsWith('video/')) return 'video';
		if (mimetype.startsWith('audio/')) return 'audio';
	}

	// Default fallback
	return 'image';
}

/**
 * Detects if a message contains view once content in replied messages
 * @param {Object} ctx - The message context from Zaileys
 * @returns {boolean} True if view once content is detected, false otherwise
 */
export function detectViewOnceContent(ctx) {
	const hasViewOnce = ctx.replied &&
		   ctx.replied.media &&
		   (ctx.replied.isViewOnce ||
			ctx.replied.media.viewOnce ||
			ctx.replied.chatType === 'viewOnce');

	if (hasViewOnce) {
		const mediaType = getViewOnceMediaType(ctx.replied);
		botLogger.viewOnceDetected("View once content detected in replied message", {
			chatId: ctx.replied?.chatId,
			chatType: ctx.replied?.chatType,
			mediaType: mediaType,
			isViewOnce: ctx.replied?.isViewOnce,
			mediaViewOnce: ctx.replied?.media?.viewOnce,
			mimetype: ctx.replied?.media?.mimetype
		});
	}

	return hasViewOnce;
}

/**
 * Handles media extraction from replied messages
 * @param {Object} ctx - The message context from Zaileys
 * @returns {Promise<Object|null>} Object containing paths to saved media and replied message data, or null if not applicable
 */
export async function handleRepliedMessage(ctx) {
	// Check if this message is a reply
	if (ctx.replied) {
		try {
			botLogger.processing("Processing replied message", {
				chatId: ctx.replied.chatId,
				roomId: ctx.replied.roomId,
				hasMedia: !!ctx.replied.media
			});

			const repliedData = {
				chatId: ctx.replied.chatId,
				roomId: ctx.replied.roomId,
				senderId: ctx.replied.senderId,
				roomName: ctx.replied.roomName,
				senderName: ctx.replied.senderName,
				text: ctx.replied.text,
				chatType: ctx.replied.chatType,
				isGroup: ctx.replied.isGroup,
				isStory: ctx.replied.isStory,
				isEdited: ctx.replied.isEdited,
				isForwarded: ctx.replied.isForwarded,
				imagePath: null,
				viewOnceMediaPath: null,
				viewOnceMediaType: null
			};

			// Check if the replied message has media
			if (ctx.replied.media) {
				// Only process view once messages - check multiple indicators
				if (ctx.replied.isViewOnce || ctx.replied.media.viewOnce || ctx.replied.chatType === 'viewOnce') {
					const mediaType = getViewOnceMediaType(ctx.replied);

					botLogger.viewOnceDetected(`View once ${mediaType} detected from replied message`, {
						chatId: ctx.replied.chatId,
						roomId: ctx.replied.roomId,
						chatType: ctx.replied.chatType,
						mediaType: mediaType,
						mimetype: ctx.replied.media.mimetype
					});

					const mediaBuffer = await ctx.replied.media.buffer();
					const fileExtension = getMediaFileExtension(ctx.replied.chatType, ctx.replied.media.mimetype);
					const viewOncePath = await saveViewOnceMedia(mediaBuffer, ctx.replied.chatId, ctx.replied.roomId, fileExtension, mediaType);

					repliedData.viewOnceMediaPath = viewOncePath;
					repliedData.viewOnceMediaType = mediaType;

					botLogger.success(`View once ${mediaType} extracted and saved`, {
						path: viewOncePath,
						roomId: ctx.replied.roomId,
						mediaType: mediaType,
						size: `${(mediaBuffer.length / 1024).toFixed(2)}KB`
					});
				}
			}

			botLogger.completed("Replied message processing completed", {
				hasViewOnceMedia: !!repliedData.viewOnceMediaPath,
				mediaType: repliedData.viewOnceMediaType
			});

			return repliedData;
		} catch (error) {
			botLogger.error("Error processing replied message", { 
				error: error.message,
				chatId: ctx.replied?.chatId,
				stack: error.stack
			});
		}
	}
	return null;
}
