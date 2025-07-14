import fs from "fs/promises";
import path from "path";
import { loadMessages } from "../services/messageStorage.js";
import { botLogger } from "../../logger.js";

/**
 * Media Storage Management Utilities
 */

/**
 * Get comprehensive storage statistics
 * @returns {Promise<Object>} Detailed storage statistics
 */
export async function getStorageStatistics() {
	try {
		const messages = await loadMessages();
		const stats = {
			overview: {
				totalMessages: messages.length,
				messagesWithMedia: 0,
				totalEstimatedSize: 0
			},
			byContentType: {},
			byMediaType: {},
			byRoom: {},
			bySender: {},
			byDate: {},
			recentActivity: []
		};

		// Process each message
		for (const msg of messages) {
			// Count messages with media
			if (msg.hasMedia || msg.imagePath || msg.mediaPath || msg.viewOnceImagePath || msg.storyMediaPath) {
				stats.overview.messagesWithMedia++;
			}

			// Group by content type
			const contentType = msg.contentType || 'unknown';
			if (!stats.byContentType[contentType]) {
				stats.byContentType[contentType] = { count: 0, totalSize: 0 };
			}
			stats.byContentType[contentType].count++;

			// Group by media type
			const mediaType = msg.mediaType || msg.chatType || 'unknown';
			if (!stats.byMediaType[mediaType]) {
				stats.byMediaType[mediaType] = { count: 0, totalSize: 0 };
			}
			stats.byMediaType[mediaType].count++;

			// Group by room
			const roomName = msg.roomName || msg.roomId || 'unknown';
			if (!stats.byRoom[roomName]) {
				stats.byRoom[roomName] = { count: 0, isGroup: msg.isGroup };
			}
			stats.byRoom[roomName].count++;

			// Group by sender
			const senderName = msg.senderName || 'unknown';
			if (!stats.bySender[senderName]) {
				stats.bySender[senderName] = { count: 0 };
			}
			stats.bySender[senderName].count++;

			// Group by date
			const timestamp = msg.timestamp || msg.processedAt;
			if (timestamp) {
				const dateObj = new Date(timestamp);
				if (!isNaN(dateObj.getTime())) {
					const date = dateObj.toISOString().split('T')[0];
					if (!stats.byDate[date]) {
						stats.byDate[date] = { count: 0 };
					}
					stats.byDate[date].count++;
				}
			}

			// Add file size if available
			const fileSize = msg.media?.fileLength || 0;
			if (fileSize > 0) {
				stats.overview.totalEstimatedSize += fileSize;
				stats.byContentType[contentType].totalSize += fileSize;
				stats.byMediaType[mediaType].totalSize += fileSize;
			}

			// Track recent activity (last 10 messages)
			if (stats.recentActivity.length < 10) {
				stats.recentActivity.push({
					timestamp: msg.timestamp || msg.processedAt,
					roomName: msg.roomName,
					senderName: msg.senderName,
					mediaType: mediaType,
					hasMedia: !!(msg.hasMedia || msg.imagePath || msg.mediaPath)
				});
			}
		}

		// Sort recent activity by timestamp
		stats.recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

		return stats;
	} catch (error) {
		botLogger.error("Error getting storage statistics", { error: error.message });
		throw error;
	}
}

/**
 * Get directory size for a specific path
 * @param {string} dirPath - Directory path to analyze
 * @returns {Promise<Object>} Directory size information
 */
export async function getDirectorySize(dirPath) {
	try {
		let totalSize = 0;
		let fileCount = 0;

		async function scanDirectory(currentPath) {
			const items = await fs.readdir(currentPath, { withFileTypes: true });
			
			for (const item of items) {
				const fullPath = path.join(currentPath, item.name);
				
				// Skip symbolic links to prevent infinite loops
				const stats = await fs.lstat(fullPath);
				if (stats.isSymbolicLink()) {
					continue;
				}
				
				if (item.isDirectory()) {
					await scanDirectory(fullPath);
				} else if (item.isFile()) {
					const fileStats = await fs.stat(fullPath);
					totalSize += fileStats.size;
					fileCount++;
				}
			}
		}

		await scanDirectory(dirPath);

		return {
			path: dirPath,
			totalSize,
			fileCount,
			formattedSize: formatBytes(totalSize)
		};
	} catch (error) {
		return {
			path: dirPath,
			totalSize: 0,
			fileCount: 0,
			formattedSize: '0 B',
			error: error.message
		};
	}
}

/**
 * Get comprehensive directory analysis
 * @returns {Promise<Object>} Directory analysis for all media folders
 */
export async function analyzeMediaDirectories() {
	const directories = [
		'./data/images',
		'./data/viewonce', 
		'./data/stories',
		'./data/media'
	];

	const analysis = {
		overview: {
			totalSize: 0,
			totalFiles: 0
		},
		directories: {}
	};

	for (const dir of directories) {
		try {
			const dirInfo = await getDirectorySize(dir);
			analysis.directories[dir] = dirInfo;
			analysis.overview.totalSize += dirInfo.totalSize;
			analysis.overview.totalFiles += dirInfo.fileCount;
		} catch (error) {
			analysis.directories[dir] = {
				path: dir,
				totalSize: 0,
				fileCount: 0,
				formattedSize: '0 B',
				error: error.message
			};
		}
	}

	analysis.overview.formattedSize = formatBytes(analysis.overview.totalSize);
	return analysis;
}

/**
 * Clean up old media files based on age
 * @param {number} daysOld - Remove files older than this many days
 * @param {boolean} dryRun - If true, only report what would be deleted
 * @returns {Promise<Object>} Cleanup results
 */
export async function cleanupOldMedia(daysOld = 30, dryRun = true) {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - daysOld);

	const results = {
		scanned: 0,
		toDelete: 0,
		deletedFiles: [],
		errors: [],
		estimatedSpaceSaved: 0
	};

	const directories = [
		'./data/images',
		'./data/viewonce',
		'./data/stories',
		'./data/media'
	];

	async function scanDirectory(dirPath) {
		try {
			const items = await fs.readdir(dirPath, { withFileTypes: true });
			
			for (const item of items) {
				const fullPath = path.join(dirPath, item.name);
				
				// Skip symbolic links to prevent infinite loops
				const stats = await fs.lstat(fullPath);
				if (stats.isSymbolicLink()) {
					continue;
				}
				
				if (item.isDirectory()) {
					await scanDirectory(fullPath);
				} else if (item.isFile()) {
					results.scanned++;
					const fileStats = await fs.stat(fullPath);
					
					if (fileStats.mtime < cutoffDate) {
						results.toDelete++;
						results.estimatedSpaceSaved += fileStats.size;
						
						if (!dryRun) {
							try {
								await fs.unlink(fullPath);
								results.deletedFiles.push(fullPath);
								botLogger.info(`Deleted old file: ${fullPath}`);
							} catch (deleteError) {
								results.errors.push({
									file: fullPath,
									error: deleteError.message
								});
							}
						}
					}
				}
			}
		} catch (error) {
			results.errors.push({
				directory: dirPath,
				error: error.message
			});
		}
	}

	for (const dir of directories) {
		await scanDirectory(dir);
	}

	return {
		...results,
		dryRun,
		cutoffDate: cutoffDate.toISOString(),
		formattedSpaceSaved: formatBytes(results.estimatedSpaceSaved)
	};
}

/**
 * Find duplicate media files
 * @returns {Promise<Object>} Duplicate analysis results
 */
export async function findDuplicateMedia() {
	const duplicates = {
		bySizeAndName: {},
		potentialDuplicates: [],
		totalDuplicateSize: 0
	};

	const directories = [
		'./data/images',
		'./data/viewonce',
		'./data/stories', 
		'./data/media'
	];

	async function scanForDuplicates(dirPath) {
		try {
			const items = await fs.readdir(dirPath, { withFileTypes: true });
			
			for (const item of items) {
				const fullPath = path.join(dirPath, item.name);
				
				// Skip symbolic links to prevent infinite loops
				const stats = await fs.lstat(fullPath);
				if (stats.isSymbolicLink()) {
					continue;
				}
				
				if (item.isDirectory()) {
					await scanForDuplicates(fullPath);
				} else if (item.isFile()) {
					const fileStats = await fs.stat(fullPath);
					const key = `${item.name}_${fileStats.size}`;
					
					if (!duplicates.bySizeAndName[key]) {
						duplicates.bySizeAndName[key] = [];
					}
					
					duplicates.bySizeAndName[key].push({
						path: fullPath,
						size: fileStats.size,
						mtime: fileStats.mtime
					});
				}
			}
		} catch (error) {
			botLogger.error("Error scanning for duplicates", { error: error.message, dirPath });
		}
	}

	for (const dir of directories) {
		await scanForDuplicates(dir);
	}

	// Find actual duplicates
	for (const [key, files] of Object.entries(duplicates.bySizeAndName)) {
		if (files.length > 1) {
			duplicates.potentialDuplicates.push({
				key,
				files,
				duplicateCount: files.length - 1,
				wastedSpace: files[0].size * (files.length - 1)
			});
			duplicates.totalDuplicateSize += files[0].size * (files.length - 1);
		}
	}

	delete duplicates.bySizeAndName; // Remove to reduce output size

	return {
		...duplicates,
		formattedTotalWaste: formatBytes(duplicates.totalDuplicateSize)
	};
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Export media data for external analysis
 * @param {string} format - Export format ('json' or 'csv')
 * @returns {Promise<string>} Export data as string
 */
export async function exportMediaData(format = 'json') {
	try {
		const messages = await loadMessages();
		const mediaMessages = messages.filter(msg => 
			msg.hasMedia || msg.imagePath || msg.mediaPath || msg.viewOnceImagePath || msg.storyMediaPath
		);

		if (format === 'csv') {
			const headers = [
				'timestamp', 'roomName', 'senderName', 'mediaType', 'contentType',
				'fileSize', 'mediaPath', 'caption', 'isGroup'
			];
			
			const csvRows = [headers.join(',')];
			
			// Helper function to escape CSV field values
			const escapeCsvField = (value) => {
				if (value == null) return '';
				const stringValue = String(value);
				// Replace double quotes with two double quotes, then wrap in quotes
				return `"${stringValue.replace(/"/g, '""')}"`;
			};
			
			mediaMessages.forEach(msg => {
				const row = [
					escapeCsvField(msg.timestamp || ''),
					escapeCsvField(msg.roomName || ''),
					escapeCsvField(msg.senderName || ''),
					escapeCsvField(msg.mediaType || msg.chatType || ''),
					escapeCsvField(msg.contentType || ''),
					msg.media?.fileLength || 0,
					escapeCsvField(msg.mediaPath || msg.imagePath || msg.viewOnceImagePath || msg.storyMediaPath || ''),
					escapeCsvField(msg.media?.caption || msg.text || ''),
					msg.isGroup || false
				];
				csvRows.push(row.join(','));
			});
			
			return csvRows.join('\n');
		} else {
			return JSON.stringify(mediaMessages, null, 2);
		}
	} catch (error) {
		botLogger.error("Error exporting media data", { error: error.message });
		throw error;
	}
}
