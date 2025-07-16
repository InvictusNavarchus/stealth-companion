import 'dotenv/config';
import { ReconnectConfig, ClientConfig } from '../../types/index.js';

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
const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
	if (value === undefined || value === null) return defaultValue;
	return value.toLowerCase() === 'true';
};

/**
 * Helper function to parse integer environment variables
 * @param {string} value - The environment variable value
 * @param {number} defaultValue - The default value if not set
 * @returns {number} The parsed integer value
 */
const parseInteger = (value: string | undefined, defaultValue: number): number => {
	if (value === undefined || value === null) return defaultValue;
	const parsed = parseInt(value, 10);
	return isNaN(parsed) ? defaultValue : parsed;
};

// Reconnection configuration
export const RECONNECT_CONFIG: ReconnectConfig = {
	maxRetries: parseInteger(process.env['RECONNECT_MAX_RETRIES'], 10),
	retryDelay: parseInteger(process.env['RECONNECT_RETRY_DELAY'], 30000),
	connectionTimeout: parseInteger(process.env['RECONNECT_CONNECTION_TIMEOUT'], 30000),
	currentRetries: 0
};

// WhatsApp client configuration
const authType = process.env['CLIENT_AUTH_TYPE'] === "pairing" ? "pairing" : "qr" as const;
const databaseType = (process.env['DATABASE_TYPE'] as "sqlite" | "postgresql" | "mysql") || "sqlite";

export const CLIENT_CONFIG: ClientConfig = authType === "pairing"
	? {
		authType: "pairing",
		phoneNumber: parseInt(process.env['CLIENT_PHONE_NUMBER'] || "0"),
		prefix: process.env['CLIENT_PREFIX'] || "/",
		ignoreMe: parseBoolean(process.env['CLIENT_IGNORE_ME'], false),
		showLogs: parseBoolean(process.env['CLIENT_SHOW_LOGS'], true),
		autoRead: parseBoolean(process.env['CLIENT_AUTO_READ'], true),
		autoOnline: parseBoolean(process.env['CLIENT_AUTO_ONLINE'], true),
		autoPresence: parseBoolean(process.env['CLIENT_AUTO_PRESENCE'], true),
		autoRejectCall: parseBoolean(process.env['CLIENT_AUTO_REJECT_CALL'], true),
		loadLLMSchemas: parseBoolean(process.env['CLIENT_LOAD_LLM_SCHEMAS'], false),
		database: {
			type: databaseType,
			connection: { url: process.env['DATABASE_URL'] || "./session/zaileys.db" },
		},
	}
	: {
		authType: "qr",
		prefix: process.env['CLIENT_PREFIX'] || "/",
		ignoreMe: parseBoolean(process.env['CLIENT_IGNORE_ME'], false),
		showLogs: parseBoolean(process.env['CLIENT_SHOW_LOGS'], true),
		autoRead: parseBoolean(process.env['CLIENT_AUTO_READ'], true),
		autoOnline: parseBoolean(process.env['CLIENT_AUTO_ONLINE'], true),
		autoPresence: parseBoolean(process.env['CLIENT_AUTO_PRESENCE'], true),
		autoRejectCall: parseBoolean(process.env['CLIENT_AUTO_REJECT_CALL'], true),
		loadLLMSchemas: parseBoolean(process.env['CLIENT_LOAD_LLM_SCHEMAS'], false),
		database: {
			type: databaseType,
			connection: { url: process.env['DATABASE_URL'] || "./session/zaileys.db" },
		},
	};
