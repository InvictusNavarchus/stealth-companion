import { Client } from "zaileys";
import fs from "fs/promises";
import path from "path";
import { botLogger } from "./logger.js";

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

botLogger.startup("Initializing Stealth Companion WhatsApp Bot", {
	authType: "qr",
	database: "sqlite",
	features: ["autoRead", "autoOnline", "autoPresence", "autoRejectCall"]
});

/**
 * Ensures the messages JSON file exists, creates it if not
 * @returns {Promise<Array>} The existing messages array or empty array
 */
async function loadMessages() {
	try {
		botLogger.fileOperation("Loading messages from JSON file", { file: "./data/messages.json" });
		const data = await fs.readFile("./data/messages.json", "utf8");
		const messages = JSON.parse(data);
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
async function saveMessages(messages) {
	try {
		botLogger.fileOperation(`Saving ${messages.length} messages to JSON file`, { file: "./data/messages.json" });
		await fs.writeFile("./data/messages.json", JSON.stringify(messages, null, 2));
		botLogger.success("Messages saved successfully");
	} catch (error) {
		botLogger.error("Failed to save messages", { error: error.message, file: "./data/messages.json" });
		throw error;
	}
}

/**
 * Saves image buffer to the images folder
 * @param {Buffer} imageBuffer - The image data
 * @param {string} chatId - The message chat ID for filename
 * @param {string} fileExtension - The file extension (jpg, png, etc.)
 * @returns {Promise<string>} The relative path to the saved image
 */
async function saveImage(imageBuffer, chatId, fileExtension = "jpg") {
	try {
		const timestamp = Date.now();
		const filename = `${chatId}_${timestamp}.${fileExtension}`;
		const imagePath = path.join("./data/images", filename);
		
		botLogger.mediaProcessing(`Saving image file`, { 
			chatId, 
			filename, 
			size: `${(imageBuffer.length / 1024).toFixed(2)}KB`,
			extension: fileExtension 
		});
		
		await fs.writeFile(imagePath, imageBuffer);
		botLogger.mediaSaved(`Image saved successfully`, { path: imagePath });
		return `./data/images/${filename}`;
	} catch (error) {
		botLogger.error("Failed to save image", { error: error.message, chatId, extension: fileExtension });
		throw error;
	}
}

/**
 * Saves view once image buffer to the dedicated viewonce folder
 * @param {Buffer} imageBuffer - The image data
 * @param {string} chatId - The message chat ID for filename
 * @param {string} fileExtension - The file extension (jpg, png, etc.)
 * @returns {Promise<string>} The relative path to the saved view once image
 */
async function saveViewOnceImage(imageBuffer, chatId, fileExtension = "jpg") {
	try {
		const timestamp = Date.now();
		const filename = `viewonce_${chatId}_${timestamp}.${fileExtension}`;
		const imagePath = path.join("./data/viewonce", filename);
		
		botLogger.mediaProcessing(`Saving view once image`, { 
			chatId, 
			filename, 
			size: `${(imageBuffer.length / 1024).toFixed(2)}KB`,
			extension: fileExtension 
		});
		
		await fs.writeFile(imagePath, imageBuffer);
		botLogger.mediaSaved(`View once image saved successfully`, { path: imagePath });
		return `./data/viewonce/${filename}`;
	} catch (error) {
		botLogger.error("Failed to save view once image", { error: error.message, chatId, extension: fileExtension });
		throw error;
	}
}

/**
 * Detects if a message contains view once content in replied messages
 * @param {Object} ctx - The message context from Zaileys
 * @returns {boolean} True if view once content is detected, false otherwise
 */
function detectViewOnceContent(ctx) {
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
async function handleRepliedMessage(ctx) {
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

/**
 * Processes and stores a received message - only saves view once messages
 * @param {Object} ctx - The message context from Zaileys
 */
async function storeMessage(ctx) {
	try {
		botLogger.processing("Processing message for view once content", {
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			hasReplied: !!ctx.replied
		});

		// Handle replied message extraction for view once messages only
		const repliedData = await handleRepliedMessage(ctx);
		
		// Only save messages that contain view once images
		if (repliedData && repliedData.viewOnceImagePath) {
			botLogger.database("Loading existing messages for update");
			const messages = await loadMessages();
			
			// Create streamlined message object focused on view once data
			const messageData = {
				// Main message metadata
				chatId: ctx.chatId,
				timestamp: new Date().toISOString(),
				text: ctx.text,
				
				// View once image info
				viewOnceImagePath: repliedData.viewOnceImagePath,
				
				// Replied message data (the view once content)
				viewOnceMessage: {
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
					isViewOnce: ctx.replied.isViewOnce,
					
					// Media metadata
					media: {
						mimetype: ctx.replied.media.mimetype,
						caption: ctx.replied.media.caption,
						height: ctx.replied.media.height,
						width: ctx.replied.media.width,
						viewOnce: ctx.replied.media.viewOnce
					}
				},
				
				// Context of the reply message (who replied to the view once)
				replyContext: {
					roomId: ctx.roomId,
					roomName: ctx.roomName,
					senderId: ctx.senderId,
					senderName: ctx.senderName,
					isGroup: ctx.isGroup
				}
			};
			
			// Add message to array and save
			messages.push(messageData);
			await saveMessages(messages);
			
			botLogger.success("View once message stored successfully", {
				totalMessages: messages.length,
				roomName: ctx.roomName,
				senderName: ctx.senderName
			});
		} else {
			botLogger.debug("Message does not contain view once content, skipping storage");
		}
	} catch (error) {
		botLogger.error("Error storing message", {
			error: error.message,
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			stack: error.stack
		});
	}
}

wa.on("messages", async (ctx) => {
    botLogger.messageReceived("Message received", {
        chatId: ctx.chatId,
        roomId: ctx.roomId,
        roomName: ctx.roomName,
        senderName: ctx.senderName,
        isGroup: ctx.isGroup,
        hasReplied: !!ctx.replied,
        text: ctx.text ? ctx.text.substring(0, 50) + (ctx.text.length > 50 ? '...' : '') : 'No text'
    });

    // Only process and store messages if they contain view once content
    if (detectViewOnceContent(ctx)) {
        await storeMessage(ctx);
    }
    
	if (ctx.text === "test") {
        botLogger.info("Test command received, sending response", { roomId: ctx.roomId });
		await wa.text("Hello!", { roomId: ctx.roomId });
        botLogger.messageSent("Test response sent", { roomId: ctx.roomId });
	}
});

// Add connection event listener
wa.on("connection", (ctx) => {
    switch (ctx.status) {
        case 'connecting':
            botLogger.connection("Connecting to WhatsApp...");
            break;
        case 'open':
            botLogger.success("Successfully connected to WhatsApp!");
            break;
        case 'close':
            botLogger.warning("WhatsApp connection closed");
            break;
        default:
            botLogger.connection(`Connection status: ${ctx.status}`);
    }
});

// Handle process termination gracefully
process.on('SIGINT', () => {
    botLogger.shutdown("Received SIGINT, shutting down gracefully...");
    process.exit(0);
});

process.on('SIGTERM', () => {
    botLogger.shutdown("Received SIGTERM, shutting down gracefully...");
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    botLogger.error("Uncaught exception", { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    botLogger.error("Unhandled promise rejection", { reason, promise });
});

botLogger.startup("Stealth Companion bot started and ready for messages");
