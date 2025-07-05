import { handleMessage } from "./messageHandler.js";
import { handleConnection } from "./connectionHandler.js";

/**
 * Sets up event listeners for the WhatsApp client
 * @param {Client} client - The WhatsApp client instance
 */
export function setupEventListeners(client) {
	// Handle incoming messages
	client.on("messages", async (ctx) => {
		await handleMessage(ctx, client);
	});

	// Handle connection events with reconnection logic
	client.on("connection", async (ctx) => {
		await handleConnection(ctx);
	});
}
