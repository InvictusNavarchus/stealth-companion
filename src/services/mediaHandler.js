import fs from "fs/promises";
import path from "path";
import { botLogger } from "../../logger.js";

/**
 * Sanitizes roomId for use as directory name
 * @param {string} roomId - The room ID to sanitize
 * @returns {string} Sanitized room ID safe for filesystem use
 */
function sanitizeRoomId(roomId) {
	return roomId.replace(/[^a-zA-Z0-9@.-]/g, '_');
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath - The directory path to ensure exists
 * @returns {Promise<void>}
 */
async function ensureDirectoryExists(dirPath) {
	try {
		await fs.mkdir(dirPath, { recursive: true });
	} catch (error) {
		if (error.code !== 'EEXIST') {
			botLogger.error("Failed to create directory", { error: error.message, dirPath });
			throw error;
		}
	}
}

/**
 * Saves image buffer to the images folder organized by room
 * @param {Buffer} imageBuffer - The image data
 * @param {string} chatId - The message chat ID for filename
 * @param {string} roomId - The room ID for directory organization
 * @param {string} fileExtension - The file extension (jpg, png, etc.)
 * @returns {Promise<string>} The relative path to the saved image
 */
export async function saveImage(imageBuffer, chatId, roomId, fileExtension = "jpg") {
	try {
		// Sanitize roomId for directory name
		const sanitizedRoomId = sanitizeRoomId(roomId);
		const roomDir = path.join("./data/images", sanitizedRoomId);
		
		// Ensure room directory exists
		await ensureDirectoryExists(roomDir);
		
		const timestamp = Date.now();
		const filename = `${chatId}_${timestamp}.${fileExtension}`;
		const imagePath = path.join(roomDir, filename);
		
		botLogger.mediaProcessing(`Saving image file`, { 
			chatId,
			roomId,
			filename, 
			size: `${(imageBuffer.length / 1024).toFixed(2)}KB`,
			extension: fileExtension 
		});
		
		await fs.writeFile(imagePath, imageBuffer);
		botLogger.mediaSaved(`Image saved successfully`, { path: imagePath, roomId });
		return `./data/images/${sanitizedRoomId}/${filename}`;
	} catch (error) {
		botLogger.error("Failed to save image", { error: error.message, chatId, roomId, extension: fileExtension });
		throw error;
	}
}

/**
 * Saves view once image buffer to the dedicated viewonce folder organized by room
 * @param {Buffer} imageBuffer - The image data
 * @param {string} chatId - The message chat ID for filename
 * @param {string} roomId - The room ID for directory organization
 * @param {string} fileExtension - The file extension (jpg, png, etc.)
 * @returns {Promise<string>} The relative path to the saved view once image
 */
export async function saveViewOnceImage(imageBuffer, chatId, roomId, fileExtension = "jpg") {
	try {
		// Sanitize roomId for directory name
		const sanitizedRoomId = sanitizeRoomId(roomId);
		const roomDir = path.join("./data/viewonce", sanitizedRoomId);
		
		// Ensure room directory exists
		await ensureDirectoryExists(roomDir);
		
		const timestamp = Date.now();
		const filename = `viewonce_${chatId}_${timestamp}.${fileExtension}`;
		const imagePath = path.join(roomDir, filename);
		
		botLogger.mediaProcessing(`Saving view once image`, { 
			chatId,
			roomId,
			filename, 
			size: `${(imageBuffer.length / 1024).toFixed(2)}KB`,
			extension: fileExtension 
		});
		
		await fs.writeFile(imagePath, imageBuffer);
		botLogger.mediaSaved(`View once image saved successfully`, { path: imagePath, roomId });
		return `./data/viewonce/${sanitizedRoomId}/${filename}`;
	} catch (error) {
		botLogger.error("Failed to save view once image", { error: error.message, chatId, roomId, extension: fileExtension });
		throw error;
	}
}

/**
 * Saves story media buffer to the stories folder organized by sender
 * @param {Buffer} mediaBuffer - The media data
 * @param {string} senderId - The sender ID for filename and directory organization
 * @param {string} fileExtension - The file extension (jpg, png, mp4, etc.)
 * @param {string} mediaType - The media type (image, video, audio, etc.)
 * @returns {Promise<string>} The relative path to the saved story media
 */
export async function saveStoryMedia(mediaBuffer, senderId, fileExtension = "jpg", mediaType = "image") {
	try {
		// Sanitize senderId for directory name
		const sanitizedSenderId = sanitizeRoomId(senderId);
		const senderDir = path.join("./data/stories", sanitizedSenderId);
		
		// Ensure sender directory exists
		await ensureDirectoryExists(senderDir);
		
		const timestamp = Date.now();
		const filename = `story_${senderId}_${timestamp}.${fileExtension}`;
		const mediaPath = path.join(senderDir, filename);
		
		botLogger.mediaProcessing(`Saving story ${mediaType}`, { 
			senderId, 
			filename, 
			size: `${(mediaBuffer.length / 1024).toFixed(2)}KB`,
			extension: fileExtension,
			mediaType
		});
		
		await fs.writeFile(mediaPath, mediaBuffer);
		botLogger.mediaSaved(`Story ${mediaType} saved successfully`, { path: mediaPath, senderId });
		return `./data/stories/${sanitizedSenderId}/${filename}`;
	} catch (error) {
		botLogger.error(`Failed to save story ${mediaType}`, { 
			error: error.message, 
			senderId, 
			extension: fileExtension,
			mediaType 
		});
		throw error;
	}
}

/**
 * Determines file extension from media type and mimetype
 * @param {string} chatType - The chat type from context (image, video, audio, etc.)
 * @param {string} mimetype - The mimetype of the media
 * @returns {string} The appropriate file extension
 */
export function getMediaFileExtension(chatType, mimetype) {
	try {
		// Extract extension from mimetype if available
		if (mimetype) {
			const mimeExtensionMap = {
				'image/jpeg': 'jpg',
				'image/jpg': 'jpg',
				'image/png': 'png',
				'image/gif': 'gif',
				'image/webp': 'webp',
				'video/mp4': 'mp4',
				'video/avi': 'avi',
				'video/mov': 'mov',
				'audio/mpeg': 'mp3',
				'audio/mp4': 'm4a',
				'audio/ogg': 'ogg',
				'audio/wav': 'wav'
			};
			
			if (mimeExtensionMap[mimetype]) {
				return mimeExtensionMap[mimetype];
			}
			
			// Fallback: try to extract from mimetype string
			const parts = mimetype.split('/');
			if (parts.length === 2) {
				return parts[1];
			}
		}
		
		// Fallback based on chatType
		const typeExtensionMap = {
			'image': 'jpg',
			'video': 'mp4',
			'audio': 'mp3',
			'voice': 'ogg',
			'document': 'pdf'
		};
		
		return typeExtensionMap[chatType] || 'bin';
	} catch (error) {
		botLogger.error("Error determining file extension", {
			error: error.message,
			chatType,
			mimetype
		});
		return 'bin';
	}
}

/**
 * Handles and saves regular image messages (not view once or stories)
 * @param {Object} ctx - The message context from Zaileys
 * @returns {Promise<string|null>} The path to the saved image or null if not applicable
 */
export async function handleImageMessage(ctx) {
	try {
		// Only process image messages that have media
		if (ctx.chatType === 'image' && ctx.media) {
			botLogger.mediaProcessing("Processing regular image message", {
				chatId: ctx.chatId,
				roomId: ctx.roomId,
				roomName: ctx.roomName,
				senderName: ctx.senderName,
				mimetype: ctx.media.mimetype
			});

			// Download image buffer
			const imageBuffer = await ctx.media.buffer();
			
			// Determine file extension
			const fileExtension = getMediaFileExtension(ctx.chatType, ctx.media.mimetype);
			
			// Save image organized by room
			const imagePath = await saveImage(imageBuffer, ctx.chatId, ctx.roomId, fileExtension);
			
			botLogger.success("Regular image saved successfully", {
				path: imagePath,
				roomId: ctx.roomId,
				roomName: ctx.roomName,
				size: `${(imageBuffer.length / 1024).toFixed(2)}KB`
			});

			return imagePath;
		}
		
		return null;
	} catch (error) {
		botLogger.error("Failed to handle image message", {
			error: error.message,
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			stack: error.stack
		});
		return null;
	}
}

/**
 * Handles and saves regular media messages (images, videos, documents, audio)
 * @param {Object} ctx - The message context from Zaileys
 * @returns {Promise<string|null>} The path to the saved media or null if not applicable
 */
export async function handleMediaMessage(ctx) {
	try {
		// Support multiple media types
		const supportedTypes = ['image', 'video', 'document', 'audio', 'voice'];
		
		if (supportedTypes.includes(ctx.chatType) && ctx.media) {
			botLogger.mediaProcessing(`Processing ${ctx.chatType} message`, {
				chatId: ctx.chatId,
				roomId: ctx.roomId,
				roomName: ctx.roomName,
				senderName: ctx.senderName,
				mimetype: ctx.media.mimetype,
				mediaType: ctx.chatType
			});

			// Download media buffer
			const mediaBuffer = await ctx.media.buffer();
			
			// Determine file extension
			const fileExtension = getMediaFileExtension(ctx.chatType, ctx.media.mimetype);
			
			// Use appropriate save function based on media type
			let mediaPath;
			if (ctx.chatType === 'image') {
				mediaPath = await saveImage(mediaBuffer, ctx.chatId, ctx.roomId, fileExtension);
			} else {
				// For non-image media, use a generic media save function
				mediaPath = await saveMedia(mediaBuffer, ctx.chatId, ctx.roomId, fileExtension, ctx.chatType);
			}
			
			botLogger.success(`${ctx.chatType} saved successfully`, {
				path: mediaPath,
				roomId: ctx.roomId,
				roomName: ctx.roomName,
				size: `${(mediaBuffer.length / 1024).toFixed(2)}KB`,
				mediaType: ctx.chatType
			});

			return mediaPath;
		}
		
		return null;
	} catch (error) {
		botLogger.error(`Failed to handle ${ctx.chatType} message`, {
			error: error.message,
			chatId: ctx.chatId,
			roomId: ctx.roomId,
			mediaType: ctx.chatType,
			stack: error.stack
		});
		return null;
	}
}

/**
 * Saves generic media buffer to the media folder organized by room and type
 * @param {Buffer} mediaBuffer - The media data
 * @param {string} chatId - The message chat ID for filename
 * @param {string} roomId - The room ID for directory organization
 * @param {string} fileExtension - The file extension
 * @param {string} mediaType - The media type (video, audio, document, etc.)
 * @returns {Promise<string>} The relative path to the saved media
 */
export async function saveMedia(mediaBuffer, chatId, roomId, fileExtension = "bin", mediaType = "media") {
	try {
		// Sanitize roomId for directory name
		const sanitizedRoomId = sanitizeRoomId(roomId);
		const roomDir = path.join("./data/media", sanitizedRoomId, mediaType);
		
		// Ensure room and media type directory exists
		await ensureDirectoryExists(roomDir);
		
		const timestamp = Date.now();
		const filename = `${mediaType}_${chatId}_${timestamp}.${fileExtension}`;
		const mediaPath = path.join(roomDir, filename);
		
		botLogger.mediaProcessing(`Saving ${mediaType} file`, { 
			chatId,
			roomId,
			filename, 
			size: `${(mediaBuffer.length / 1024).toFixed(2)}KB`,
			extension: fileExtension,
			mediaType
		});
		
		await fs.writeFile(mediaPath, mediaBuffer);
		botLogger.mediaSaved(`${mediaType} saved successfully`, { path: mediaPath, roomId, mediaType });
		return `./data/media/${sanitizedRoomId}/${mediaType}/${filename}`;
	} catch (error) {
		botLogger.error(`Failed to save ${mediaType}`, { 
			error: error.message, 
			chatId, 
			roomId, 
			extension: fileExtension, 
			mediaType 
		});
		throw error;
	}
}
