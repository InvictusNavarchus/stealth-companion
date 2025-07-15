import { botLogger } from "../../logger.js";

/**
 * Sets up process event handlers for graceful shutdown and error handling
 */
export function setupProcessHandlers() {
	// Handle SIGINT (Ctrl+C)
	process.on('SIGINT', () => {
		botLogger.shutdown("Received SIGINT, shutting down gracefully...");
		process.exit(0);
	});

	// Handle SIGTERM
	process.on('SIGTERM', () => {
		botLogger.shutdown("Received SIGTERM, shutting down gracefully...");
		process.exit(0);
	});

	// Handle uncaught exceptions
	process.on('uncaughtException', (error) => {
		botLogger.error("Uncaught exception", { error: error.message, stack: error.stack });
		process.exit(1);
	});

	// Handle unhandled promise rejections
	process.on('unhandledRejection', (reason, promise) => {
		botLogger.error("Unhandled promise rejection", { reason, promise });
	});
}
