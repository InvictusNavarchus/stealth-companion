import { botLogger } from "../../logger.js";
import { saveViewOnceMedia, getMediaFileExtension } from "../services/mediaHandler.js";
import { MessageContext, MediaType, ViewOnceData } from "../../types/index.js";

/**
 * Determines the media type from context and mimetype
 * @param {Object} replied - The replied message context
 * @returns {string} The media type (image, video, audio)
 */
function getViewOnceMediaType(replied: MessageContext): MediaType {
	// First check chatType if available
	if (replied.chatType) {
		const chatType = replied.chatType.toLowerCase();
		if (['image', 'video', 'audio'].includes(chatType)) {
			return chatType as MediaType;
		}
		if (chatType === 'voice') {
			return 'audio';
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
export function detectViewOnceContent(ctx: MessageContext): boolean {
	const hasViewOnce = ctx.replied &&
		   ctx.replied.media &&
		   (ctx.replied.isViewOnce ||
			ctx.replied.media.viewOnce ||
			ctx.replied.chatType === 'viewOnce');

	if (hasViewOnce && ctx.replied) {
		const mediaType = getViewOnceMediaType(ctx.replied);
		botLogger.viewOnceDetected("View once content detected in replied message", {
			chatId: ctx.replied.chatId,
			chatType: ctx.replied.chatType,
			mediaType: mediaType,
			isViewOnce: ctx.replied.isViewOnce,
			mediaViewOnce: ctx.replied.media?.viewOnce,
			mimetype: ctx.replied.media?.mimetype
		});
	}

	return !!hasViewOnce;
}

/**
 * Handles media extraction from replied messages
 * @param {Object} ctx - The message context from Zaileys
 * @returns {Promise<Object|null>} Object containing paths to saved media and replied message data, or null if not applicable
 */
export async function handleRepliedMessage(ctx: MessageContext): Promise<ViewOnceData | null> {
	// Check if this message is a reply
	if (ctx.replied) {
		try {
			botLogger.processing("Processing replied message", {
				chatId: ctx.replied.chatId,
				roomId: ctx.replied.roomId,
				hasMedia: !!ctx.replied.media
			});

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

					if (ctx.replied.media.buffer) {
						const mediaBuffer = await ctx.replied.media.buffer();
						const fileExtension = getMediaFileExtension(ctx.replied.chatType, ctx.replied.media.mimetype);
						const viewOncePath = await saveViewOnceMedia(mediaBuffer, ctx.replied.chatId, ctx.replied.roomId, fileExtension, mediaType);

						const viewOnceData: ViewOnceData = {
							viewOnceImagePath: viewOncePath,
							viewOnceMediaType: mediaType,
							originalMimetype: ctx.replied.media.mimetype,
							...(ctx.replied.media.caption && { originalCaption: ctx.replied.media.caption }),
							mediaMetadata: {
								...(ctx.replied.media.height && { height: ctx.replied.media.height }),
								...(ctx.replied.media.width && { width: ctx.replied.media.width }),
								...(ctx.replied.media.fileLength && { fileLength: ctx.replied.media.fileLength }),
								...(ctx.replied.media.duration && { duration: ctx.replied.media.duration }),
								...(ctx.replied.media.pages && { pages: ctx.replied.media.pages }),
								...(ctx.replied.media.fileName && { fileName: ctx.replied.media.fileName })
							}
						};

						botLogger.success(`View once ${mediaType} extracted and saved`, {
							path: viewOncePath,
							roomId: ctx.replied.roomId,
							mediaType: mediaType,
							size: `${(mediaBuffer.length / 1024).toFixed(2)}KB`
						});

						return viewOnceData;
					}
				}
			}

			botLogger.completed("Replied message processing completed - no view once media found");
		} catch (error) {
			botLogger.error("Error processing replied message", {
				error: error instanceof Error ? error.message : String(error),
				chatId: ctx.replied?.chatId,
				stack: error instanceof Error ? error.stack : undefined
			});
		}
	}
	return null;
}
