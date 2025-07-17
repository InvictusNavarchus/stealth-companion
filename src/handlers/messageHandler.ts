import { botLogger } from "../../logger.js";
import { loadMessages, saveMessages } from "../services/messageStorage.js";
import { detectViewOnceContent, handleRepliedMessage } from "../handlers/viewOnceHandler.js";
import { detectStoryContent, handleStory } from "../handlers/storyHandler.js";
import { detectMediaContent, handleMediaMessageWrapper } from "../handlers/mediaHandler.js";
import { MessageContext, ZaileysClient, StoredViewOnceMessage, ChatType, SenderDevice } from "../../types/index.js";

/**
 * Processes and stores a received message - only saves view once messages
 * @param {Object} ctx - The message context from Zaileys
 */
export async function storeMessage(ctx: MessageContext): Promise<void> {
	try {
		botLogger.processing("Processing message for view once content", {
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			hasReplied: !!ctx.replied
		});

		// Handle replied message extraction for view once messages only
		const repliedData = await handleRepliedMessage(ctx);
		
		// Only save messages that contain view once media
		if (repliedData?.viewOnceImagePath) {
			botLogger.database("Loading existing messages for update");
			const messages = await loadMessages();
			
			// Create streamlined message object focused on view once data
			const messageData: StoredViewOnceMessage = {
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

				// View once media info
				viewOnceMediaPath: repliedData.viewOnceImagePath,
				viewOnceMediaType: repliedData.viewOnceMediaType,
				
				// Replied message data (the view once content)
				viewOnceMessage: ctx.replied ? {
					chatId: ctx.replied.chatId,
					channelId: ctx.replied.channelId,
					uniqueId: ctx.replied.uniqueId,
					roomId: ctx.replied.roomId,
					roomName: ctx.replied.roomName,
					senderId: ctx.replied.senderId,
					senderName: ctx.replied.senderName,
					senderDevice: ctx.replied.senderDevice,
					timestamp: ctx.replied.timestamp,
					text: ctx.replied.text,
					isFromMe: ctx.replied.isFromMe,
					isGroup: ctx.replied.isGroup,
					chatType: ctx.replied.chatType,

					// All required fields from BaseStoredMessage
					receiverId: ctx.replied.receiverId,
					receiverName: ctx.replied.receiverName,
					mentions: ctx.replied.mentions,
					links: ctx.replied.links,
					isPrefix: ctx.replied.isPrefix,
					isSpam: ctx.replied.isSpam,
					isTagMe: ctx.replied.isTagMe,
					isStory: ctx.replied.isStory,
					isViewOnce: ctx.replied.isViewOnce,
					isEdited: ctx.replied.isEdited,
					isDeleted: ctx.replied.isDeleted,
					isPinned: ctx.replied.isPinned,
					isUnPinned: ctx.replied.isUnPinned,
					isChannel: ctx.replied.isChannel,
					isBroadcast: ctx.replied.isBroadcast,
					isEphemeral: ctx.replied.isEphemeral,
					isForwarded: ctx.replied.isForwarded,

					// Media metadata
					media: {
						mimetype: ctx.replied.media?.mimetype || '',
						...(ctx.replied.media?.caption && { caption: ctx.replied.media.caption }),
						...(ctx.replied.media?.height && { height: ctx.replied.media.height }),
						...(ctx.replied.media?.width && { width: ctx.replied.media.width }),
						...(ctx.replied.media?.viewOnce !== undefined && { viewOnce: ctx.replied.media.viewOnce })
					}
				} : {
					// Default values for all required fields
					chatId: '',
					channelId: '',
					uniqueId: '',
					roomId: '',
					roomName: '',
					senderId: '',
					senderName: '',
					senderDevice: 'unknown' as SenderDevice,
					timestamp: 0,
					text: null,
					isFromMe: false,
					isGroup: false,
					chatType: 'text' as ChatType,
					receiverId: '',
					receiverName: '',
					mentions: [],
					links: [],
					isPrefix: false,
					isSpam: false,
					isTagMe: false,
					isStory: false,
					isViewOnce: false,
					isEdited: false,
					isDeleted: false,
					isPinned: false,
					isUnPinned: false,
					isChannel: false,
					isBroadcast: false,
					isEphemeral: false,
					isForwarded: false,
					media: { mimetype: '' }
				},
				
				// Context of the reply message (who replied to the view once)
				replyContext: {
					roomId: ctx.roomId,
					roomName: ctx.roomName,
					senderId: ctx.senderId,
					senderName: ctx.senderName,
					senderDevice: ctx.senderDevice,
					isGroup: ctx.isGroup
				}
			};
			
			// Add message to array and save
			messages.push(messageData);
			await saveMessages(messages);
			
			botLogger.success("View once message stored successfully", {
				totalMessages: messages.length,
				roomName: ctx.roomName,
				senderName: ctx.senderName,
				mediaType: repliedData.viewOnceMediaType
			});
		} else {
			botLogger.debug("Message does not contain view once content, skipping storage");
		}
	} catch (error) {
		botLogger.error("Error storing message", {
			error: (error as Error).message,
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			stack: (error as Error).stack
		});
	}
}

/**
 * Handles incoming messages and determines appropriate actions
 * @param {Object} ctx - The message context from Zaileys
 * @param {Object} client - The WhatsApp client instance
 */
export async function handleMessage(ctx: MessageContext, client: ZaileysClient): Promise<void> {
	botLogger.messageReceived("Message received", {
		chatId: ctx.chatId,
		roomId: ctx.roomId,
		roomName: ctx.roomName,
		senderName: ctx.senderName,
		senderDevice: ctx.senderDevice,
		isGroup: ctx.isGroup,
		isStory: ctx.isStory,
		isEdited: ctx.isEdited,
		isDeleted: ctx.isDeleted,
		hasReplied: !!ctx.replied,
		hasMedia: !!ctx.media,
		chatType: ctx.chatType,
		text: ctx.text || '',
		messageTimestamp: ctx.timestamp
	});

	// Handle stories/status updates first
	if (detectStoryContent(ctx)) {
		await handleStory(ctx, client);
		return; // Stories are handled separately
	}

	// Handle regular media messages (images, videos, audio, documents)
	if (detectMediaContent(ctx)) {
		await handleMediaMessageWrapper(ctx, client);
		return; // Media messages are handled separately
	}

	// Only process and store messages if they contain view once content
	if (detectViewOnceContent(ctx)) {
		await storeMessage(ctx);
	}
	
	// Handle test command
	if (ctx.text === "test") {
		botLogger.info("Test command received. No response is given under stealth mode");
	}
}
