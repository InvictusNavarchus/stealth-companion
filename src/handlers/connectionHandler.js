import { Client } from "zaileys";
import { botLogger } from "../../logger.js";
import { CLIENT_CONFIG, RECONNECT_CONFIG } from "../config/index.js";

/**
 * Attempts to reconnect to WhatsApp with retry logic
 * @returns {Promise<void>}
 */
export async function attemptReconnection() {
	if (RECONNECT_CONFIG.currentRetries >= RECONNECT_CONFIG.maxRetries) {
		botLogger.error("Maximum reconnection attempts reached", {
			maxRetries: RECONNECT_CONFIG.maxRetries,
			totalAttempts: RECONNECT_CONFIG.currentRetries
		});
		return;
	}

	RECONNECT_CONFIG.currentRetries++;
	
	botLogger.warning(`Attempting reconnection ${RECONNECT_CONFIG.currentRetries}/${RECONNECT_CONFIG.maxRetries}`, {
		retryDelay: `${RECONNECT_CONFIG.retryDelay / 1000}s`,
		attempt: RECONNECT_CONFIG.currentRetries
	});

	try {
		// Wait for the specified delay before attempting reconnection
		await new Promise(resolve => setTimeout(resolve, RECONNECT_CONFIG.retryDelay));
		
		// Create new client instance for reconnection
		const newWa = new Client(CLIENT_CONFIG);

		// Re-setup event listeners for the new client
		const { setupEventListeners } = await import("./eventHandler.js");
		setupEventListeners(newWa);
		
		botLogger.info("Reconnection attempt initiated", {
			attempt: RECONNECT_CONFIG.currentRetries,
			remaining: RECONNECT_CONFIG.maxRetries - RECONNECT_CONFIG.currentRetries
		});

	} catch (error) {
		botLogger.error("Reconnection attempt failed", {
			error: error.message,
			attempt: RECONNECT_CONFIG.currentRetries,
			stack: error.stack
		});
		
		// Attempt another reconnection
		await attemptReconnection();
	}
}

/**
 * Handles connection status changes
 * @param {Object} ctx - The connection context from Zaileys
 */
export async function handleConnection(ctx) {
	switch (ctx.status) {
		case 'connecting':
			botLogger.connection("Connecting to WhatsApp...");
			break;
		case 'open':
			botLogger.success("Successfully connected to WhatsApp!");
			// Reset retry counter on successful connection
			RECONNECT_CONFIG.currentRetries = 0;
			break;
		case 'close':
			botLogger.warning("WhatsApp connection closed");
			// Attempt reconnection after connection closes
			await attemptReconnection();
			break;
		default:
			botLogger.connection(`Connection status: ${ctx.status}`);
	}
}
