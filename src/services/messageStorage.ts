import fs from "fs/promises";
import { z } from "zod";
import { botLogger } from "../../logger.js";
import { AnyStoredMessage, ChatType } from "../../types/index.js";

// Zod schema for validating stored messages
const ChatTypeSchema = z.enum([
	'text', 'image', 'video', 'audio', 'voice', 'document', 'sticker',
	'location', 'contact', 'viewOnce', 'story'
]);

const BaseStoredMessageSchema = z.object({
	chatId: z.string(),
	channelId: z.string().optional(),
	uniqueId: z.string().optional(),
	roomId: z.string(),
	roomName: z.string(),
	senderId: z.string(),
	senderName: z.string(),
	senderDevice: z.string().optional(),
	timestamp: z.union([z.number(), z.string()]),
	text: z.string().optional(),
	isFromMe: z.boolean().optional(),
	isGroup: z.boolean(),
	chatType: ChatTypeSchema,
	processedAt: z.string().optional(),
});

const MediaInfoSchema = z.object({
	mimetype: z.string(),
	caption: z.string().optional(),
	height: z.number().optional(),
	width: z.number().optional(),
	fileLength: z.number().optional(),
	duration: z.number().optional(),
	pages: z.number().optional(),
	fileName: z.string().optional(),
	viewOnce: z.boolean().optional(),
}).passthrough(); // Allow additional properties like buffer() and stream()

const StoredMessageSchema = BaseStoredMessageSchema.extend({
	id: z.string(),
	originalMessage: z.object({
		chatId: z.string(),
		roomId: z.string(),
		roomName: z.string(),
		senderId: z.string(),
		senderName: z.string(),
		isGroup: z.boolean(),
		timestamp: z.number(),
		chatType: ChatTypeSchema,
		text: z.string().optional(),
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
