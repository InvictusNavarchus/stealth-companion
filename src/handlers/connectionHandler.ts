import { Client } from "zaileys";
import { botLogger } from "../../logger.js";
import { CLIENT_CONFIG, RECONNECT_CONFIG } from "../config/index.js";
import { ZaileysClient, ConnectionContext } from "../../types/index.js";

// Connection monitoring state
let connectionTimeout: NodeJS.Timeout | null = null;
let currentClient: ZaileysClient | null = null;

/**
 * Clears any existing connection timeout
 */
function clearConnectionTimeout(): void {
	if (connectionTimeout) {
		clearTimeout(connectionTimeout);
		connectionTimeout = null;
		botLogger.info("Connection timeout cleared");
	}
}

/**
 * Sets a connection establishment timeout to monitor for failed connection attempts
 * This timeout specifically monitors whether a connection reaches 'open' status within the expected timeframe
 * @param {number} timeoutMs - Timeout duration in milliseconds for connection establishment
 */
function setConnectionEstablishmentTimeout(timeoutMs: number = RECONNECT_CONFIG.connectionTimeout): void {
	// Clear any existing timeout to prevent duplicates
	clearConnectionTimeout();

	connectionTimeout = setTimeout(() => {
		botLogger.warning("Connection establishment timeout reached - no 'open' status received", {
			timeoutMs: timeoutMs,
			currentRetries: RECONNECT_CONFIG.currentRetries
		});

		// Trigger reconnection attempt
		attemptReconnection();
	}, timeoutMs);

	botLogger.info("Connection establishment timeout set", {
		timeoutMs: timeoutMs,
		attempt: RECONNECT_CONFIG.currentRetries + 1
	});
}

/**
 * Attempts to reconnect to WhatsApp with retry logic
 * @returns {Promise<void>}
 */
export async function attemptReconnection(): Promise<void> {
	// Clear any existing timeout since we're manually triggering reconnection
	clearConnectionTimeout();

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
		currentClient = new Client(CLIENT_CONFIG as any);

		// Re-setup event listeners for the new client
		const { setupEventListeners } = await import("./eventHandler.js");
		setupEventListeners(currentClient);
		
		// Set timeout to monitor this connection attempt
		setConnectionEstablishmentTimeout();
		
		botLogger.info("Reconnection attempt initiated", {
			attempt: RECONNECT_CONFIG.currentRetries,
			remaining: RECONNECT_CONFIG.maxRetries - RECONNECT_CONFIG.currentRetries
		});

	} catch (error) {
		botLogger.error("Reconnection attempt failed", {
			error: (error as Error).message,
			attempt: RECONNECT_CONFIG.currentRetries,
			stack: (error as Error).stack
		});

		// Attempt another reconnection
		await attemptReconnection();
	}
}

/**
 * Handles connection status changes with robust monitoring
 * @param {Object} ctx - The connection context from Zaileys
 */
export async function handleConnection(ctx: ConnectionContext): Promise<void> {
	botLogger.info(`Connection status change: ${ctx.status}`, {
		status: ctx.status,
		currentRetries: RECONNECT_CONFIG.currentRetries
	});

	switch (ctx.status) {
		case 'connecting':
			botLogger.connection("Connecting to WhatsApp...");
			// Set timeout to monitor this connection attempt
			setConnectionEstablishmentTimeout();
			break;

		case 'connected':
			botLogger.success("Successfully connected to WhatsApp!");
			// Clear timeout since connection succeeded
			clearConnectionTimeout();
			// Reset retry counter on successful connection
			RECONNECT_CONFIG.currentRetries = 0;
			break;

		case 'disconnected':
			botLogger.warning("WhatsApp connection closed");
			// Clear any existing timeout
			clearConnectionTimeout();
			// Attempt reconnection after connection closes
			await attemptReconnection();
			break;

		default:
			// Handle any other connection states (like failed, timeout, etc.)
			botLogger.warning(`Unhandled connection status: ${ctx.status}`);
			// For any non-open status, we should consider it a failed connection
			// Clear existing timeout and attempt reconnection
			clearConnectionTimeout();
			await attemptReconnection();
			break;
	}
}

/**
 * Initializes connection monitoring for a new client instance
 * @param {Client} client - The Zaileys client instance
 */
export function initializeConnectionMonitoring(client: ZaileysClient): void {
	currentClient = client;
	// Connection timeout will be set when handleConnection processes the 'connecting' status
	botLogger.info("Connection monitoring initialized for new client");
}
