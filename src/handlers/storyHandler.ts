import { botLogger } from "../../logger.js";
import { loadMessages, saveMessages } from "../services/messageStorage.js";
import { saveStoryMedia, getMediaFileExtension } from "../services/mediaHandler.js";
import { 
	isStoryMessage, 
	hasStoryMedia, 
	extractStoryMetadata, 
	shouldProcessStory 
} from "../utils/storyDetector.js";

/**
 * Processes and stores a story/status update with media
 * @param {Object} ctx - The message context from Zaileys
 */
export async function storeStory(ctx) {
	try {
		botLogger.processing("Processing story for media content", {
			senderId: ctx.senderId,
			senderName: ctx.senderName,
			chatType: ctx.chatType,
			hasMedia: hasStoryMedia(ctx)
		});

		// Extract story metadata
		const storyMetadata = extractStoryMetadata(ctx);
		if (!storyMetadata) {
			botLogger.warning("Failed to extract story metadata, skipping");
			return;
		}

		let storyMediaPath = null;

		// Process and save media if present
		if (hasStoryMedia(ctx) && ctx.media) {
			try {
				botLogger.mediaProcessing("Downloading story media", {
					senderId: ctx.senderId,
					chatType: ctx.chatType,
					mimetype: ctx.media.mimetype
				});

				// Download media buffer
				const mediaBuffer = await ctx.media.buffer();
				
				// Determine file extension
				const fileExtension = getMediaFileExtension(ctx.chatType, ctx.media.mimetype);
				
				// Save story media
				storyMediaPath = await saveStoryMedia(
					mediaBuffer, 
					ctx.senderId, 
					fileExtension, 
					ctx.chatType
				);

				botLogger.mediaSaved("Story media saved successfully", {
					path: storyMediaPath,
					senderId: ctx.senderId,
					senderName: ctx.senderName
				});
			} catch (mediaError) {
				botLogger.error("Failed to process story media", {
					error: mediaError.message,
					senderId: ctx.senderId,
					chatType: ctx.chatType
				});
				// Continue without media
			}
		}

		// Load existing messages and add story data
		botLogger.database("Loading existing messages for story update");
		const messages = await loadMessages();
		
		// Create story data object
		const storyData = {
			...storyMetadata,
			
			// Add media path if successfully saved
			storyMediaPath,
			
			// Processing metadata
			processedAt: new Date().toISOString(),
			mediaType: ctx.chatType,
			
			// Story specific data
			storyData: {
				isStory: true,
				originalChatType: ctx.chatType,
				mediaDownloaded: !!storyMediaPath
			}
		};
		
		// Add story to messages array and save
		messages.push(storyData);
		await saveMessages(messages);
		
		botLogger.success("Story stored successfully", {
			totalMessages: messages.length,
			senderName: storyData.senderName,
			hasMedia: !!storyMediaPath,
			mediaType: ctx.chatType
		});
	} catch (error) {
		botLogger.error("Error storing story", {
			error: error.message,
			senderId: ctx.senderId,
			senderName: ctx.senderName,
			stack: error.stack
		});
	}
}

/**
 * Handles incoming story/status messages and determines appropriate actions
 * @param {Object} ctx - The message context from Zaileys
 * @param {Object} client - The WhatsApp client instance
 */
export async function handleStory(ctx, client) {
	botLogger.messageReceived("Story received", {
		senderId: ctx.senderId,
		senderName: ctx.senderName,
		chatType: ctx.chatType,
		hasMedia: hasStoryMedia(ctx),
		text: ctx.text || ''
	});

	// Only process and store stories if they should be processed
	if (shouldProcessStory(ctx)) {
		await storeStory(ctx);
	} else {
		botLogger.debug("Story skipped based on processing criteria", {
			senderId: ctx.senderId,
			isFromMe: ctx.isFromMe,
			hasMedia: hasStoryMedia(ctx)
		});
	}
}

/**
 * Detects if a message context represents a story that needs processing
 * @param {Object} ctx - The message context from Zaileys
 * @returns {boolean} True if this is a processable story
 */
export function detectStoryContent(ctx) {
	return shouldProcessStory(ctx);
}
