import { Client } from "zaileys";
import fs from "fs/promises";
import path from "path";

// default configuration
const wa = new Client({
	authType: "qr",
	prefix: "/",
	ignoreMe: false,
	showLogs: true,
	autoRead: true,
	autoOnline: true,
	autoPresence: true,
	autoRejectCall: true,
	loadLLMSchemas: false,
	database: {
		type: "sqlite",
		connection: { url: "./session/zaileys.db" },
	},
});

/**
 * Ensures the messages JSON file exists, creates it if not
 * @returns {Promise<Array>} The existing messages array or empty array
 */
async function loadMessages() {
	try {
		const data = await fs.readFile("./data/messages.json", "utf8");
		return JSON.parse(data);
	} catch (error) {
		// File doesn't exist, create empty array
		return [];
	}
}

/**
 * Saves messages array to JSON file
 * @param {Array} messages - Array of message objects to save
 */
async function saveMessages(messages) {
	await fs.writeFile("./data/messages.json", JSON.stringify(messages, null, 2));
}

/**
 * Saves image buffer to the images folder
 * @param {Buffer} imageBuffer - The image data
 * @param {string} chatId - The message chat ID for filename
 * @param {string} fileExtension - The file extension (jpg, png, etc.)
 * @returns {Promise<string>} The relative path to the saved image
 */
async function saveImage(imageBuffer, chatId, fileExtension = "jpg") {
	const timestamp = Date.now();
	const filename = `${chatId}_${timestamp}.${fileExtension}`;
	const imagePath = path.join("./data/images", filename);
	
	await fs.writeFile(imagePath, imageBuffer);
	return `./data/images/${filename}`;
}

/**
 * Saves view once image buffer to the dedicated viewonce folder
 * @param {Buffer} imageBuffer - The image data
 * @param {string} chatId - The message chat ID for filename
 * @param {string} fileExtension - The file extension (jpg, png, etc.)
 * @returns {Promise<string>} The relative path to the saved view once image
 */
async function saveViewOnceImage(imageBuffer, chatId, fileExtension = "jpg") {
	const timestamp = Date.now();
	const filename = `viewonce_${chatId}_${timestamp}.${fileExtension}`;
	const imagePath = path.join("./data/viewonce", filename);
	
	await fs.writeFile(imagePath, imageBuffer);
	return `./data/viewonce/${filename}`;
}

/**
 * Handles media extraction from replied messages
 * @param {Object} ctx - The message context from Zaileys
 * @returns {Promise<Object|null>} Object containing paths to saved media and replied message data, or null if not applicable
 */
async function handleRepliedMessage(ctx) {
	// Check if this message is a reply
	if (ctx.replied) {
		try {
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
				console.log(`🔍 Extracting media from replied message: ${ctx.replied.chatId} (type: ${ctx.replied.chatType})`);
				
				const imageBuffer = await ctx.replied.media.buffer();
				const fileExtension = ctx.replied.media.mimetype?.split("/")[1] || "jpg";
				
				// Save to viewonce folder if it's a view once message, otherwise to regular images folder
				if (ctx.replied.isViewOnce || ctx.replied.media.viewOnce) {
					const viewOncePath = await saveViewOnceImage(imageBuffer, ctx.replied.chatId, fileExtension);
					repliedData.viewOnceImagePath = viewOncePath;
					console.log(`🕵️ View once image extracted and saved: ${viewOncePath}`);
				} else {
					const imagePath = await saveImage(imageBuffer, ctx.replied.chatId, fileExtension);
					repliedData.imagePath = imagePath;
					console.log(`📸 Replied message image saved: ${imagePath}`);
				}
			}

			return repliedData;
		} catch (error) {
			console.error("Error processing replied message:", error);
		}
	}
	return null;
}

/**
 * Processes and stores a received message
 * @param {Object} ctx - The message context from Zaileys
 */
async function storeMessage(ctx) {
	const messages = await loadMessages();
	
	// Create base message object
	const messageData = {
		chatId: ctx.chatId,
		roomId: ctx.roomId,
		senderId: ctx.senderId,
		roomName: ctx.roomName,
		senderName: ctx.senderName,
		text: ctx.text,
		timestamp: new Date().toISOString(),
		chatType: ctx.chatType,
		isGroup: ctx.isGroup,
		isStory: ctx.isStory,
		isEdited: ctx.isEdited,
		isForwarded: ctx.isForwarded,
		imagePath: null, // Will be set if message contains an image
		viewOnceImagePath: null, // Will be set if view once image is extracted from reply
		repliedMessage: null // Will be set if this message is a reply
	};
	
	// Handle replied message extraction
	const repliedData = await handleRepliedMessage(ctx);
	if (repliedData) {
		messageData.repliedMessage = repliedData;
		// Also set the media paths at the top level for backward compatibility
		if (repliedData.viewOnceImagePath) {
			messageData.viewOnceImagePath = repliedData.viewOnceImagePath;
		}
	}
	
	// Handle regular image messages
	if (ctx.chatType === "image" && ctx.media) {
		try {
			const imageBuffer = await ctx.media.buffer();
			const fileExtension = ctx.media.mimetype?.split("/")[1] || "jpg";
			const imagePath = await saveImage(imageBuffer, ctx.chatId, fileExtension);
			messageData.imagePath = imagePath;
			console.log(`📸 Image saved: ${imagePath}`);
		} catch (error) {
			console.error("Error saving image:", error);
		}
	}
	
	// Add message to array and save
	messages.push(messageData);
	await saveMessages(messages);
	console.log(`💾 Message stored: ${messageData.chatId}`);
}

wa.on("messages", async (ctx) => {
    console.log(ctx);
    
    // Store the message
    await storeMessage(ctx);
    
	if (ctx.text === "test") {
		await wa.text("Hello!", { roomId: ctx.roomId });
	}
});
