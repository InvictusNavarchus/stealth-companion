import fs from "fs/promises";
import path from "path";
import { botLogger } from "../../logger.js";

/**
 * Saves image buffer to the images folder
 * @param {Buffer} imageBuffer - The image data
 * @param {string} chatId - The message chat ID for filename
 * @param {string} fileExtension - The file extension (jpg, png, etc.)
 * @returns {Promise<string>} The relative path to the saved image
 */
export async function saveImage(imageBuffer, chatId, fileExtension = "jpg") {
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
export async function saveViewOnceImage(imageBuffer, chatId, fileExtension = "jpg") {
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
 * Saves story media buffer to the stories folder
 * @param {Buffer} mediaBuffer - The media data
 * @param {string} senderId - The sender ID for filename
 * @param {string} fileExtension - The file extension (jpg, png, mp4, etc.)
 * @param {string} mediaType - The media type (image, video, audio, etc.)
 * @returns {Promise<string>} The relative path to the saved story media
 */
export async function saveStoryMedia(mediaBuffer, senderId, fileExtension = "jpg", mediaType = "image") {
	try {
		const timestamp = Date.now();
		const filename = `story_${senderId}_${timestamp}.${fileExtension}`;
		const mediaPath = path.join("./data/stories", filename);
		
		botLogger.mediaProcessing(`Saving story ${mediaType}`, { 
			senderId, 
			filename, 
			size: `${(mediaBuffer.length / 1024).toFixed(2)}KB`,
			extension: fileExtension,
			mediaType
		});
		
		await fs.writeFile(mediaPath, mediaBuffer);
		botLogger.mediaSaved(`Story ${mediaType} saved successfully`, { path: mediaPath });
		return `./data/stories/${filename}`;
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
