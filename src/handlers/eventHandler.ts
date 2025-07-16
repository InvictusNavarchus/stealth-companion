import { handleMessage } from "./messageHandler.js";
import { handleConnection } from "./connectionHandler.js";
import { ZaileysClient, MessageContext, ConnectionContext } from "../../types/index.js";

/**
 * Sets up event listeners for the WhatsApp client
 * @param {Client} client - The WhatsApp client instance
 */
export function setupEventListeners(client: ZaileysClient): void {
	// Handle incoming messages
	client.on("messages", async (ctx: MessageContext) => {
		await handleMessage(ctx, client);
	});

	// Handle connection events with reconnection logic
	client.on("connection", async (ctx: ConnectionContext) => {
		await handleConnection(ctx);
	});
}
