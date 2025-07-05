import fs from "fs/promises";
import { botLogger } from "../logger.js";

/**
 * Ensures the messages JSON file exists, creates it if not
 * @returns {Promise<Array>} The existing messages array or empty array
 */
export async function loadMessages() {
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
export async function saveMessages(messages) {
	try {
		botLogger.fileOperation(`Saving ${messages.length} messages to JSON file`, { file: "./data/messages.json" });
		await fs.writeFile("./data/messages.json", JSON.stringify(messages, null, 2));
		botLogger.success("Messages saved successfully");
	} catch (error) {
		botLogger.error("Failed to save messages", { error: error.message, file: "./data/messages.json" });
		throw error;
	}
}
