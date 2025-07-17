import { Client } from "zaileys";
import { botLogger } from "../../logger.js";
import { CLIENT_CONFIG, RECONNECT_CONFIG } from "../config/index.js";
import { ZaileysClient, ConnectionContext } from "../../types/index.js";

// Connection monitoring state
let connectionTimeout: NodeJS.Timeout | null = null;
let reconnectionTimeout: NodeJS.Timeout | null = null;
let currentClient: ZaileysClient | null = null;
let isReconnecting: boolean = false;
let isConnected: boolean = false;
let lastConnectionAttempt: number = 0;
let lastConnectingEvent: number = 0;

// Minimum time between connection attempts (prevents rapid-fire attempts)
const MIN_CONNECTION_INTERVAL = 5000; // 5 seconds
// Minimum time between processing 'connecting' events (prevents duplicate timeout setups)
const MIN_CONNECTING_EVENT_INTERVAL = 1000; // 1 second

/**
 * Clears any existing connection timeout
 */
function clearConnectionTimeout(): void {
	if (connectionTimeout) {
		clearTimeout(connectionTimeout);
		connectionTimeout = null;
		botLogger.info("ℹ️ Connection timeout cleared");
	}
}

/**
 * Clears any existing reconnection timeout
 */
function clearReconnectionTimeout(): void {
	if (reconnectionTimeout) {
		clearTimeout(reconnectionTimeout);
		reconnectionTimeout = null;
		botLogger.info("ℹ️ Reconnection timeout cleared");
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
		// Only trigger reconnection if we're not already connected and not already reconnecting
		if (!isConnected && !isReconnecting) {
			botLogger.warning("⚠️ Connection establishment timeout reached - no 'open' status received", {
				timeoutMs: timeoutMs,
				currentRetries: RECONNECT_CONFIG.currentRetries
			});

			// Trigger reconnection attempt
			scheduleReconnection();
		}
	}, timeoutMs);

	botLogger.info("ℹ️ Connection establishment timeout set", {
		timeoutMs: timeoutMs,
		attempt: RECONNECT_CONFIG.currentRetries + 1
	});
}

/**
 * Schedules a reconnection attempt with proper delay and state management
 */
function scheduleReconnection(): void {
	// Prevent multiple simultaneous reconnection attempts
	if (isReconnecting) {
		botLogger.info("ℹ️ Reconnection already in progress, skipping duplicate attempt");
		return;
	}

	// Check if we've exceeded max retries
	if (RECONNECT_CONFIG.currentRetries >= RECONNECT_CONFIG.maxRetries) {
		botLogger.error("❌ Maximum reconnection attempts reached", {
			maxRetries: RECONNECT_CONFIG.maxRetries,
			totalAttempts: RECONNECT_CONFIG.currentRetries
		});
		return;
	}

	// Enforce minimum interval between connection attempts
	const now = Date.now();
	const timeSinceLastAttempt = now - lastConnectionAttempt;
	const minDelay = Math.max(0, MIN_CONNECTION_INTERVAL - timeSinceLastAttempt);
	const totalDelay = RECONNECT_CONFIG.retryDelay + minDelay;

	RECONNECT_CONFIG.currentRetries++;
	isReconnecting = true;

	botLogger.warning(`⚠️ Attempting reconnection ${RECONNECT_CONFIG.currentRetries}/${RECONNECT_CONFIG.maxRetries}`, {
		retryDelay: `${totalDelay / 1000}s`,
		attempt: RECONNECT_CONFIG.currentRetries
	});

	// Clear any existing reconnection timeout
	clearReconnectionTimeout();

	reconnectionTimeout = setTimeout(async () => {
		await performReconnection();
	}, totalDelay);
}

/**
 * Performs the actual reconnection attempt
 * @returns {Promise<void>}
 */
async function performReconnection(): Promise<void> {
	lastConnectionAttempt = Date.now();

	try {
		// Cleanup old client if it exists
		if (currentClient) {
			try {
				// Attempt to properly close the old client
				// Note: Zaileys may not have a direct close method, so we just null the reference
				currentClient = null;
			} catch (cleanupError) {
				botLogger.warning("⚠️ Error during client cleanup", {
					error: (cleanupError as Error).message
				});
			}
		}

		// Create new client instance for reconnection
		currentClient = new Client(CLIENT_CONFIG as any);

		// Re-setup event listeners for the new client
		const { setupEventListeners } = await import("./eventHandler.js");
		setupEventListeners(currentClient);

		// Set timeout to monitor this connection attempt
		setConnectionEstablishmentTimeout();

		botLogger.info("ℹ️ Reconnection attempt initiated", {
			attempt: RECONNECT_CONFIG.currentRetries,
			remaining: RECONNECT_CONFIG.maxRetries - RECONNECT_CONFIG.currentRetries
		});

	} catch (error) {
		botLogger.error("❌ Reconnection attempt failed", {
			error: (error as Error).message,
			attempt: RECONNECT_CONFIG.currentRetries,
			stack: (error as Error).stack
		});

		// Reset reconnecting state and schedule another attempt
		isReconnecting = false;
		scheduleReconnection();
	}
}

/**
 * Schedules a reconnection attempt with exponential backoff
 * @returns {Promise<void>}
 */
export async function attemptReconnection(): Promise<void> {
	scheduleReconnection();
}

/**
 * Handles connection status changes with robust monitoring
 * @param {Object} ctx - The connection context from Zaileys
 */
export async function handleConnection(ctx: ConnectionContext): Promise<void> {
	botLogger.info(`ℹ️ Connection status change: ${ctx.status}`, {
		status: ctx.status,
		currentRetries: RECONNECT_CONFIG.currentRetries
	});

	switch (ctx.status) {
		case 'connecting': {
			const now = Date.now();
			const timeSinceLastConnectingEvent = now - lastConnectingEvent;

			// Prevent processing multiple rapid 'connecting' events
			if (timeSinceLastConnectingEvent < MIN_CONNECTING_EVENT_INTERVAL) {
				botLogger.info("ℹ️ Ignoring rapid 'connecting' event", {
					timeSinceLastEvent: `${timeSinceLastConnectingEvent}ms`,
					minInterval: `${MIN_CONNECTING_EVENT_INTERVAL}ms`
				});
				return; // Exit early to prevent duplicate processing
			}

			lastConnectingEvent = now;
			botLogger.connection("🔗 Connecting to WhatsApp...");

			// Only set timeout if we don't already have one active
			if (!connectionTimeout && !isConnected) {
				setConnectionEstablishmentTimeout();
			} else if (connectionTimeout) {
				botLogger.info("ℹ️ Connection timeout already active, not setting new one");
			}
			break;
		}

		case 'open': // Zaileys uses 'open' for successful connections, not 'connected'
			botLogger.success("✅ Successfully connected to WhatsApp!");
			// Clear all timeouts since connection succeeded
			clearConnectionTimeout();
			clearReconnectionTimeout();
			// Reset state
			isConnected = true;
			isReconnecting = false;
			RECONNECT_CONFIG.currentRetries = 0;
			break;

		case 'close': // Zaileys uses 'close' for disconnections, not 'disconnected'
			botLogger.warning("⚠️ WhatsApp connection closed");
			// Update state
			isConnected = false;
			// Clear any existing timeouts
			clearConnectionTimeout();
			clearReconnectionTimeout();
			// Schedule reconnection if not already in progress
			if (!isReconnecting) {
				scheduleReconnection();
			}
			break;

		case 'connected':
			botLogger.success("✅ Successfully connected to WhatsApp!");
			clearConnectionTimeout();
			clearReconnectionTimeout();
			isConnected = true;
			isReconnecting = false;
			RECONNECT_CONFIG.currentRetries = 0;
			break;

		case 'disconnected':
			botLogger.warning("⚠️ WhatsApp connection closed");
			isConnected = false;
			clearConnectionTimeout();
			clearReconnectionTimeout();
			if (!isReconnecting) {
				scheduleReconnection();
			}
			break;

		default:
			// Handle any other connection states
			botLogger.warning(`⚠️ Unhandled connection status: ${ctx.status}`);
			// For unknown status, only attempt reconnection if we're not connected
			if (!isConnected && !isReconnecting) {
				clearConnectionTimeout();
				clearReconnectionTimeout();
				scheduleReconnection();
			}
			break;
	}
}

/**
 * Initializes connection monitoring for a new client instance
 * @param {Client} client - The Zaileys client instance
 */
export function initializeConnectionMonitoring(client: ZaileysClient): void {
	currentClient = client;
	// Reset connection state
	isConnected = false;
	isReconnecting = false;
	RECONNECT_CONFIG.currentRetries = 0;
	lastConnectionAttempt = Date.now();
	lastConnectingEvent = 0;

	// Clear any existing timeouts
	clearConnectionTimeout();
	clearReconnectionTimeout();

	botLogger.info("ℹ️ Connection monitoring initialized for new client");
}

/**
 * Gets the current connection state for debugging/monitoring
 */
export function getConnectionState(): {
	isConnected: boolean;
	isReconnecting: boolean;
	currentRetries: number;
	hasActiveTimeout: boolean;
	hasActiveReconnectionTimeout: boolean;
	lastConnectionAttempt: number;
	lastConnectingEvent: number;
	timeSinceLastConnectingEvent: number;
} {
	return {
		isConnected,
		isReconnecting,
		currentRetries: RECONNECT_CONFIG.currentRetries,
		hasActiveTimeout: connectionTimeout !== null,
		hasActiveReconnectionTimeout: reconnectionTimeout !== null,
		lastConnectionAttempt,
		lastConnectingEvent,
		timeSinceLastConnectingEvent: Date.now() - lastConnectingEvent
	};
}
