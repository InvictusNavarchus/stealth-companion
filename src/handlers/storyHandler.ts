import { botLogger } from "../../logger.js";
import { loadMessages, saveMessages } from "../services/messageStorage.js";
import { saveStoryMedia, getMediaFileExtension } from "../services/mediaHandler.js";
import { MessageContext, StoredStoryMessage } from "../../types/index.js";
import { 
	hasStoryMedia, 
	extractStoryMetadata, 
	shouldProcessStory 
} from "../utils/storyDetector.js";

/**
 * Processes and stores a story/status update with media
 * @param {MessageContext} ctx - The message context from Zaileys
 */
export async function storeStory(ctx: MessageContext): Promise<void> {
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
				});			// Download media buffer
			const mediaBuffer = await ctx.media?.buffer?.();
			
			if (!mediaBuffer) {
				botLogger.info("No media buffer available for story", {
					senderId: ctx.senderId,
					senderName: ctx.senderName
				});
				return;
			}
			
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
					error: mediaError instanceof Error ? mediaError.message : String(mediaError),
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
		const storyData: StoredStoryMessage = {
			// Basic message properties
			chatId: ctx.chatId,
			channelId: ctx.channelId,
			uniqueId: ctx.uniqueId,
			roomId: ctx.roomId,
			roomName: ctx.roomName,
			senderId: ctx.senderId,
			senderName: ctx.senderName,
			senderDevice: ctx.senderDevice,
			timestamp: ctx.timestamp,
			text: ctx.text,
			isFromMe: ctx.isFromMe,
			isGroup: ctx.isGroup,
			chatType: ctx.chatType,

			// All required fields from BaseStoredMessage
			receiverId: ctx.receiverId,
			receiverName: ctx.receiverName,
			mentions: ctx.mentions,
			links: ctx.links,
			isPrefix: ctx.isPrefix,
			isSpam: ctx.isSpam,
			isTagMe: ctx.isTagMe,
			isStory: ctx.isStory,
			isViewOnce: ctx.isViewOnce,
			isEdited: ctx.isEdited,
			isDeleted: ctx.isDeleted,
			isPinned: ctx.isPinned,
			isUnPinned: ctx.isUnPinned,
			isChannel: ctx.isChannel,
			isBroadcast: ctx.isBroadcast,
			isEphemeral: ctx.isEphemeral,
			isForwarded: ctx.isForwarded,

			// Processing metadata
			processedAt: new Date().toISOString(),

			// Add media path if successfully saved
			storyMediaPath,
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
			error: error instanceof Error ? error.message : String(error),
			senderId: ctx.senderId,
			senderName: ctx.senderName,
			stack: error instanceof Error ? error.stack : undefined
		});
	}
}

/**
 * Handles incoming story/status messages and determines appropriate actions
 * @param {Object} ctx - The message context from Zaileys
 * @param {Object} client - The WhatsApp client instance
 */
/**
 * Wrapper function to handle story processing
 * @param {MessageContext} ctx - The message context from Zaileys
 * @param {any} _client - The client instance (unused)
 */
export async function handleStory(ctx: MessageContext, _client: any): Promise<void> {
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
/**
 * Detects if a message contains story content
 * @param {MessageContext} ctx - The message context from Zaileys
 * @returns {boolean} True if the message is a story
 */
export function detectStoryContent(ctx: MessageContext): boolean {
	return shouldProcessStory(ctx);
}
