/**
 * Configuration settings for the Stealth Companion WhatsApp Bot
 */

// Reconnection configuration
export const RECONNECT_CONFIG = {
	maxRetries: 10,
	retryDelay: 30000, // 30 seconds
	currentRetries: 0
};

// WhatsApp client configuration
export const CLIENT_CONFIG = {
	authType: "qr",
	prefix: "/",
	ignoreMe: false,
	showLogs: true,
	autoRead: true,
	autoOnline: true,
	autoPresence: true,
	autoRejectCall: true,
	loadLLMSchemas: false,
	database: {
		type: "sqlite",
		connection: { url: "./session/zaileys.db" },
	},
};
