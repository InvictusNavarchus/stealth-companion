/**
 * Image Storage Configuration
 * Controls which images should be stored and how
 */

export const IMAGE_STORAGE_CONFIG = {
	// Enable/disable regular image storage
	enableRegularImages: true,
	
	// File size limits (in bytes)
	maxFileSize: 50 * 1024 * 1024, // 50MB max
	minFileSize: 1024, // 1KB min
	
	// Supported image formats
	supportedFormats: [
		'image/jpeg',
		'image/jpg', 
		'image/png',
		'image/gif',
		'image/webp'
	],
	
	// Room/contact filters
	filters: {
		// Skip these room IDs (empty array = process all)
		skipRooms: [],
		
		// Only process these room IDs (empty array = process all)
		onlyRooms: [],
		
		// Skip these sender IDs (empty array = process all)
		skipSenders: [],
		
		// Skip group messages (true/false)
		skipGroups: false,
		
		// Skip private messages (true/false)
		skipPrivateChats: false
	},
	
	// Storage organization
	storage: {
		// Organize by room (true) or by date (false)
		organizeByRoom: true
	},
	
	// Image processing options
	processing: {
		// Store original caption as metadata
		storeCaptions: true,
		
		// Store image dimensions
		storeDimensions: true,
		
		// Store sender information
		storeSenderInfo: true
	}
};

/**
 * Validates if an image should be stored based on configuration
 * @param {Object} ctx - The message context from Zaileys
 * @returns {boolean} True if image should be stored
 */
export function shouldStoreImage(ctx) {
	const config = IMAGE_STORAGE_CONFIG;
	
	// Check if regular image storage is enabled
	if (!config.enableRegularImages) {
		return false;
	}
	
	// Check file size limits
	if (ctx.media?.fileLength) {
		if (ctx.media.fileLength > config.maxFileSize || ctx.media.fileLength < config.minFileSize) {
			return false;
		}
	}
	
	// Check supported formats
	if (ctx.media?.mimetype && !config.supportedFormats.includes(ctx.media.mimetype)) {
		return false;
	}
	
	// Check room filters
	if (config.filters.skipRooms.length > 0 && config.filters.skipRooms.includes(ctx.roomId)) {
		return false;
	}
	
	if (config.filters.onlyRooms.length > 0 && !config.filters.onlyRooms.includes(ctx.roomId)) {
		return false;
	}
	
	// Check sender filters
	if (config.filters.skipSenders.length > 0 && config.filters.skipSenders.includes(ctx.senderId)) {
		return false;
	}
	
	// Check group/private chat filters
	if (ctx.isGroup && config.filters.skipGroups) {
		return false;
	}
	
	if (!ctx.isGroup && config.filters.skipPrivateChats) {
		return false;
	}
	
	return true;
}
