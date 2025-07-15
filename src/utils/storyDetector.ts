import { botLogger } from "../../logger.js";
import { MessageContext } from "../../types/index.js";

/**
 * Detects if a message is a story/status update
 * @param {Object} ctx - The message context from Zaileys
 * @returns {boolean} True if the message is a story/status
 */
export function isStoryMessage(ctx: MessageContext): boolean {
	try {
		// Check if it's a broadcast (story) based on roomId
		if (ctx.isStory || (ctx.roomId && ctx.roomId.includes('@broadcast'))) {
			botLogger.debug("Story message detected", {
				roomId: ctx.roomId,
				isStory: ctx.isStory,
				chatType: ctx.chatType
			});
			return true;
		}

		return false;
	} catch (error) {
		botLogger.error("Error in story detection", {
			error: (error as Error).message,
			roomId: ctx.roomId
		});
		return false;
	}
}

/**
 * Detects if a story/status contains media content
 * @param {Object} ctx - The message context from Zaileys
 * @returns {boolean} True if the story contains media
 */
export function hasStoryMedia(ctx: MessageContext): boolean {
	try {
		if (!isStoryMessage(ctx)) {
			return false;
		}

		// Check for various media types in stories
		const mediaTypes = ['image', 'video', 'audio', 'voice', 'document'];
		const hasMedia = mediaTypes.includes(ctx.chatType) && ctx.media;

		botLogger.debug("Story media detection", {
			chatType: ctx.chatType,
			hasMedia,
			mediaPresent: !!ctx.media
		});
		
		return !!hasMedia;
	} catch (error) {
		botLogger.error("Error in story media detection", {
			error: (error as Error).message,
			chatType: ctx.chatType
		});
		return false;
	}
}

/**
 * Extracts story metadata for logging and storage
 * @param {Object} ctx - The message context from Zaileys
 * @returns {Object} Story metadata object
 */
export function extractStoryMetadata(ctx: MessageContext): Record<string, unknown> | null {
	try {
		const metadata = {
			// Basic story info
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			senderId: ctx.senderId,
			senderName: ctx.senderName || 'Unknown',
			timestamp: ctx.timestamp || new Date().toISOString(),
			text: ctx.text || '',

			// Story specific flags
			isStory: true,
			chatType: ctx.chatType,

			// Media information (if present)
			hasMedia: hasStoryMedia(ctx),
			media: ctx.media ? {
				mimetype: ctx.media.mimetype,
				caption: ctx.media.caption,
				height: ctx.media.height,
				width: ctx.media.width,
				fileLength: ctx.media.fileLength,
				fileName: ctx.media.fileName
			} : null
		};

		botLogger.debug("Story metadata extracted", {
			senderId: metadata.senderId,
			senderName: metadata.senderName,
			hasMedia: metadata.hasMedia,
			chatType: metadata.chatType
		});

		return metadata;
	} catch (error) {
		botLogger.error("Error extracting story metadata", {
			error: (error as Error).message,
			chatId: ctx.chatId
		});
		return null;
	}
}

/**
 * Validates if a story should be processed and saved
 * @param {Object} ctx - The message context from Zaileys
 * @returns {boolean} True if the story should be processed
 */
export function shouldProcessStory(ctx: MessageContext): boolean {
	try {
		// Only process stories that contain media
		if (!isStoryMessage(ctx)) {
			return false;
		}

		// Skip our own stories if configured to do so
		if (ctx.isFromMe === true) {
			botLogger.debug("Skipping own story", { senderId: ctx.senderId });
			return false;
		}

		// Only process stories with media content
		if (!hasStoryMedia(ctx)) {
			botLogger.debug("Skipping text-only story", {
				senderId: ctx.senderId,
				text: ctx.text
			});
			return false;
		}

		botLogger.debug("Story should be processed", {
			senderId: ctx.senderId,
			senderName: ctx.senderName,
			chatType: ctx.chatType
		});

		return true;
	} catch (error) {
		botLogger.error("Error in story processing validation", {
			error: (error as Error).message,
			chatId: ctx.chatId
		});
		return false;
	}
}
