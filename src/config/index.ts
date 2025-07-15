import 'dotenv/config';

/**
 * Configuration settings for the Stealth Companion WhatsApp Bot
 * All values are loaded from environment variables
 */

/**
 * Helper function to parse boolean environment variables
 * @param {string} value - The environment variable value
 * @param {boolean} defaultValue - The default value if not set
 * @returns {boolean} The parsed boolean value
 */
const parseBoolean = (value, defaultValue) => {
	if (value === undefined || value === null) return defaultValue;
	return value.toLowerCase() === 'true';
};

/**
 * Helper function to parse integer environment variables
 * @param {string} value - The environment variable value
 * @param {number} defaultValue - The default value if not set
 * @returns {number} The parsed integer value
 */
const parseInteger = (value, defaultValue) => {
	if (value === undefined || value === null) return defaultValue;
	const parsed = parseInt(value, 10);
	return isNaN(parsed) ? defaultValue : parsed;
};

// Reconnection configuration
export const RECONNECT_CONFIG = {
	maxRetries: parseInteger(process.env.RECONNECT_MAX_RETRIES, 10),
	retryDelay: parseInteger(process.env.RECONNECT_RETRY_DELAY, 30000),
	connectionTimeout: parseInteger(process.env.RECONNECT_CONNECTION_TIMEOUT, 30000),
	currentRetries: 0
};

// WhatsApp client configuration
export const CLIENT_CONFIG = {
	authType: process.env.CLIENT_AUTH_TYPE || "qr",
	prefix: process.env.CLIENT_PREFIX || "/",
	ignoreMe: parseBoolean(process.env.CLIENT_IGNORE_ME, false),
	showLogs: parseBoolean(process.env.CLIENT_SHOW_LOGS, true),
	autoRead: parseBoolean(process.env.CLIENT_AUTO_READ, true),
	autoOnline: parseBoolean(process.env.CLIENT_AUTO_ONLINE, true),
	autoPresence: parseBoolean(process.env.CLIENT_AUTO_PRESENCE, true),
	autoRejectCall: parseBoolean(process.env.CLIENT_AUTO_REJECT_CALL, true),
	loadLLMSchemas: parseBoolean(process.env.CLIENT_LOAD_LLM_SCHEMAS, false),
	database: {
		type: process.env.DATABASE_TYPE || "sqlite",
		connection: { url: process.env.DATABASE_URL || "./session/zaileys.db" },
	},
};
