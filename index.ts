import { Client } from "zaileys";
import { botLogger } from "./logger.js";
import { CLIENT_CONFIG } from "./src/config/index.js";
import { setupEventListeners } from "./src/handlers/eventHandler.js";
import { setupProcessHandlers } from "./src/handlers/processHandler.js";
import { initializeConnectionMonitoring } from "./src/handlers/connectionHandler.js";

/**
 * Main entry point for the Stealth Companion WhatsApp Bot
 */
async function main(): Promise<void> {
	// Log initialization
	botLogger.startup("Initializing Stealth Companion WhatsApp Bot", {
		authType: CLIENT_CONFIG.authType,
		database: CLIENT_CONFIG.database?.type,
		autoOnline: CLIENT_CONFIG.autoOnline,
		autoPresence: CLIENT_CONFIG.autoPresence,
		autoRead: CLIENT_CONFIG.autoRead,
		autoRejectCall: CLIENT_CONFIG.autoRejectCall
	});

	// Create WhatsApp client
	const wa = new Client(CLIENT_CONFIG);

	// Initialize connection monitoring
	initializeConnectionMonitoring(wa);

	// Setup event handlers
	setupEventListeners(wa);
	setupProcessHandlers();

	// Log successful startup
	botLogger.startup("Stealth Companion bot started and ready for messages");
}

// Start the application
main().catch((error: Error) => {
	botLogger.error("Failed to start bot", { error: error.message, stack: error.stack });
	process.exit(1);
});
