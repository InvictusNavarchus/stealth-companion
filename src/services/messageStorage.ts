import fs from "fs/promises";
import { z } from "zod";
import { botLogger } from "../../logger.js";
import { AnyStoredMessage } from "../../types/index.js";

// Zod schema for validating stored messages - updated to match complete ChatType enum
const ChatTypeSchema = z.enum([
	// Text Messages
	'text',

	// Media Messages
	'image', 'video', 'audio', 'voice', 'document', 'sticker', 'ptv',

	// Interactive Messages
	'contact', 'location', 'liveLocation', 'list', 'listResponse', 'buttons',
	'buttonsResponse', 'interactive', 'interactiveResponse', 'template', 'templateButtonReply',

	// Poll Messages
	'pollCreation', 'pollUpdate',

	// Special Messages
	'reaction', 'viewOnce', 'ephemeral', 'protocol', 'groupInvite', 'product',
	'order', 'invoice', 'event', 'comment', 'callLog',

	// System Messages
	'deviceSent', 'contactsArray', 'highlyStructured', 'sendPayment', 'requestPayment',
	'declinePaymentRequest', 'cancelPaymentRequest', 'paymentInvite', 'keepInChat',
	'requestPhoneNumber', 'groupMentioned', 'pinInChat', 'scheduledCallCreation',
	'scheduledCallEdit', 'botInvoke', 'encComment', 'bcall', 'lottieSticker',
	'placeholder', 'encEventUpdate'
]);

const SenderDeviceSchema = z.enum(['unknown', 'android', 'ios', 'desktop', 'web']);

const BaseStoredMessageSchema = z.object({
	chatId: z.string(),
	channelId: z.string(),
	uniqueId: z.string(),
	roomId: z.string(),
	roomName: z.string(),
	senderId: z.string(),
	senderName: z.string(),
	senderDevice: SenderDeviceSchema,
	timestamp: z.union([z.number(), z.string()]),
	text: z.string().nullable(),
	isFromMe: z.boolean(),
	isGroup: z.boolean(),
	chatType: ChatTypeSchema,
	processedAt: z.string().optional(),

	// Additional fields from MessageContext
	receiverId: z.string(),
	receiverName: z.string(),
	mentions: z.array(z.string()),
	links: z.array(z.string()),
	isPrefix: z.boolean(),
	isSpam: z.boolean(),
	isTagMe: z.boolean(),
	isStory: z.boolean(),
	isViewOnce: z.boolean(),
	isEdited: z.boolean(),
	isDeleted: z.boolean(),
	isPinned: z.boolean(),
	isUnPinned: z.boolean(),
	isChannel: z.boolean(),
	isBroadcast: z.boolean(),
	isEphemeral: z.boolean(),
	isForwarded: z.boolean(),
});

const MediaInfoSchema = z.object({
	mimetype: z.string().optional(),
	fileSha256: z.instanceof(Buffer).optional(),
	fileLength: z.number().optional(),
	seconds: z.number().optional(), // for audio/video
	width: z.number().optional(), // for images/videos
	height: z.number().optional(), // for images/videos
	caption: z.string().optional(),

	// Additional properties available in the schema
	duration: z.number().optional(), // alias for seconds
	pages: z.number().optional(), // for documents
	fileName: z.string().optional(), // for documents
	viewOnce: z.boolean().optional(), // for view-once detection
}).passthrough(); // Allow additional properties like buffer() and stream() methods

const StoredMessageSchema = BaseStoredMessageSchema.extend({
	id: z.string(),
	originalMessage: z.object({
		chatId: z.string(),
		channelId: z.string(),
		uniqueId: z.string(),
		roomId: z.string(),
		roomName: z.string(),
		senderId: z.string(),
		senderName: z.string(),
		senderDevice: SenderDeviceSchema,
		isGroup: z.boolean(),
		timestamp: z.number(),
		chatType: ChatTypeSchema,
		text: z.string().nullable(),
		receiverId: z.string(),
		receiverName: z.string(),
	}),
	viewOnceData: z.object({
		viewOnceImagePath: z.string(),
		viewOnceMediaType: z.enum(['image', 'video', 'audio']),
		originalMimetype: z.string(),
		originalCaption: z.string().optional(),
		mediaMetadata: z.object({
			height: z.number().optional(),
			width: z.number().optional(),
			fileLength: z.number().optional(),
			duration: z.number().optional(),
			pages: z.number().optional(),
			fileName: z.string().optional(),
		}),
	}),
	replyContext: z.object({
		roomId: z.string(),
		roomName: z.string(),
		senderId: z.string(),
		senderName: z.string(),
		senderDevice: SenderDeviceSchema,
		isGroup: z.boolean(),
	}),
});

const StoredMediaMessageSchema = BaseStoredMessageSchema.extend({
	hasMedia: z.literal(true),
	mediaPath: z.string(),
	mediaType: ChatTypeSchema,
	media: MediaInfoSchema,
	contentType: z.string(),
	roomContext: z.object({
		roomId: z.string(),
		roomName: z.string(),
		isGroup: z.boolean(),
		senderName: z.string(),
		senderDevice: SenderDeviceSchema,
	}),
});

const StoredViewOnceMessageSchema = BaseStoredMessageSchema.extend({
	viewOnceMediaPath: z.string(),
	viewOnceMediaType: z.enum(['image', 'video', 'audio']),
	viewOnceMessage: BaseStoredMessageSchema.extend({
		media: MediaInfoSchema,
	}),
	replyContext: z.object({
		roomId: z.string(),
		roomName: z.string(),
		senderId: z.string(),
		senderName: z.string(),
		senderDevice: SenderDeviceSchema,
		isGroup: z.boolean(),
	}),
});

const StoredStoryMessageSchema = BaseStoredMessageSchema.extend({
	storyMediaPath: z.string().nullable(),
	mediaType: ChatTypeSchema,
	storyData: z.object({
		isStory: z.boolean(),
		originalChatType: ChatTypeSchema,
		mediaDownloaded: z.boolean(),
	}),
});

const AnyStoredMessageSchema = z.union([
	StoredMessageSchema,
	StoredMediaMessageSchema,
	StoredViewOnceMessageSchema,
	StoredStoryMessageSchema,
]);

const StoredMessagesArraySchema = z.array(AnyStoredMessageSchema);

/**
 * Ensures the messages JSON file exists, creates it if not
 * @returns {Promise<Array>} The existing messages array or empty array
 */
export async function loadMessages(): Promise<AnyStoredMessage[]> {
	try {
		botLogger.fileOperation("Loading messages from JSON file", { file: "./data/messages.json" });
		const data = await fs.readFile("./data/messages.json", "utf8");
		const parsedData = JSON.parse(data);
		const validationResult = StoredMessagesArraySchema.safeParse(parsedData);

		if (!validationResult.success) {
			botLogger.error("Invalid message data structure in JSON file", {
				error: validationResult.error.message,
				file: "./data/messages.json"
			});
			return [];
		}

		const messages = validationResult.data as AnyStoredMessage[];
		botLogger.success(`Loaded ${messages.length} messages from file`);
		return messages;
	} catch (error) {
		botLogger.fileOperation("Messages file doesn't exist, creating empty array", { file: "./data/messages.json" });
		return [];
	}
}

/**
 * Saves messages array to JSON file
 * @param {Array} messages - Array of message objects to save
 */
export async function saveMessages(messages: AnyStoredMessage[]): Promise<void> {
	try {
		botLogger.fileOperation(`Saving ${messages.length} messages to JSON file`, { file: "./data/messages.json" });
		await fs.writeFile("./data/messages.json", JSON.stringify(messages, null, 2));
		botLogger.success("Messages saved successfully");
	} catch (error) {
		botLogger.error("Failed to save messages", { error: (error as Error).message, file: "./data/messages.json" });
		throw error;
	}
}
