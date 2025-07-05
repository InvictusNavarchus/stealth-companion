import { Client } from "zaileys";
import { botLogger } from "./logger.js";
import { CLIENT_CONFIG } from "./src/config/index.js";
import { setupEventListeners } from "./src/handlers/eventHandler.js";
import { setupProcessHandlers } from "./src/handlers/processHandler.js";

/**
 * Main entry point for the Stealth Companion WhatsApp Bot
 */
async function main() {
	// Log initialization
	botLogger.startup("Initializing Stealth Companion WhatsApp Bot", {
		authType: CLIENT_CONFIG.authType,
		database: CLIENT_CONFIG.database.type,
		features: ["autoOnline", "autoPresence"]
	});

	// Create WhatsApp client
	const wa = new Client(CLIENT_CONFIG);

	// Setup event handlers
	setupEventListeners(wa);
	setupProcessHandlers();

	// Log successful startup
	botLogger.startup("Stealth Companion bot started and ready for messages");
}

// Start the application
main().catch((error) => {
	botLogger.error("Failed to start bot", { error: error.message, stack: error.stack });
	process.exit(1);
});
