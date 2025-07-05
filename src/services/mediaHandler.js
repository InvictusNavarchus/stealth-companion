import fs from "fs/promises";
import path from "path";
import { botLogger } from "../logger.js";

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
