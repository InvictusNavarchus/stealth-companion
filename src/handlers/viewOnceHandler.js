import { botLogger } from "../../logger.js";
import { saveViewOnceImage } from "../services/mediaHandler.js";

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
		botLogger.viewOnceDetected("View once content detected in replied message", {
			chatId: ctx.replied?.chatId,
			chatType: ctx.replied?.chatType,
			isViewOnce: ctx.replied?.isViewOnce,
			mediaViewOnce: ctx.replied?.media?.viewOnce
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
				viewOnceImagePath: null
			};

			// Check if the replied message has media
			if (ctx.replied.media) {
				// Only process view once messages - check multiple indicators
				if (ctx.replied.isViewOnce || ctx.replied.media.viewOnce || ctx.replied.chatType === 'viewOnce') {
					botLogger.viewOnceDetected(`View once image detected from replied message`, {
						chatId: ctx.replied.chatId,
						chatType: ctx.replied.chatType,
						mimetype: ctx.replied.media.mimetype
					});
					
					const imageBuffer = await ctx.replied.media.buffer();
					const fileExtension = ctx.replied.media.mimetype?.split("/")[1] || "jpg";
					const viewOncePath = await saveViewOnceImage(imageBuffer, ctx.replied.chatId, fileExtension);
					repliedData.viewOnceImagePath = viewOncePath;
					
					botLogger.success(`View once image extracted and saved`, { 
						path: viewOncePath,
						size: `${(imageBuffer.length / 1024).toFixed(2)}KB`
					});
				}
			}

			botLogger.completed("Replied message processing completed", {
				hasViewOnceImage: !!repliedData.viewOnceImagePath
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
