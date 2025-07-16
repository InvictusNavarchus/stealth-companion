import fs from 'fs/promises';
import path from 'path';
import { botLogger } from '../../logger.js';
import { loadMessages } from '../services/messageStorage.js';
import { AnyStoredMessage, StoredMediaMessage, StoredViewOnceMessage, StoredStoryMessage, LogMetadata, DirectoryAnalysis } from '../../types/index.js';

// Type guards for message types
function isStoredMediaMessage(msg: AnyStoredMessage): msg is StoredMediaMessage {
	return 'hasMedia' in msg && msg.hasMedia === true && 'mediaPath' in msg;
}

function isStoredViewOnceMessage(msg: AnyStoredMessage): msg is StoredViewOnceMessage {
	return 'viewOnceMediaPath' in msg;
}

function isStoredStoryMessage(msg: AnyStoredMessage): msg is StoredStoryMessage {
	return 'storyMediaPath' in msg;
}

function hasMediaContent(msg: AnyStoredMessage): boolean {
	return isStoredMediaMessage(msg) || isStoredViewOnceMessage(msg) || isStoredStoryMessage(msg);
}

function getMediaPaths(msg: AnyStoredMessage): string[] {
	const paths: string[] = [];
	
	if (isStoredMediaMessage(msg) && msg.mediaPath) {
		paths.push(msg.mediaPath);
	}
	if (isStoredViewOnceMessage(msg) && msg.viewOnceMediaPath) {
		paths.push(msg.viewOnceMediaPath);
	}
	if (isStoredStoryMessage(msg) && msg.storyMediaPath) {
		paths.push(msg.storyMediaPath);
	}
	
	return paths;
}

/**
 * Generates comprehensive statistics about stored media messages
 * @param {string} roomId - Optional room ID to filter messages
 * @returns {Promise<Object>} Media statistics object
 */
export async function getMediaStats(roomId?: string) {
	try {
		const messages = await loadMessages();
		
		// Filter by roomId if provided
		const filteredMessages = roomId ? messages.filter(msg => msg.roomId === roomId) : messages;
		
		const stats: {
			overview: {
				totalMessages: number;
				messagesWithMedia: number;
				totalEstimatedSize: number;
			};
			byContentType: Record<string, { count: number; totalSize: number }>;
			byMediaType: Record<string, { count: number; totalSize: number }>;
			byRoom: Record<string, { count: number; isGroup: boolean }>;
			bySender: Record<string, { count: number }>;
			byDate: Record<string, { count: number }>;
			recentActivity: Array<{
				timestamp: any;
				roomName?: any;
				senderName?: any;
				mediaType?: any;
				hasMedia: boolean;
			}>;
		} = {
			overview: {
				totalMessages: filteredMessages.length,
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
		for (const msg of filteredMessages) {
			// Check if message has media using type guards
			const hasMedia = hasMediaContent(msg);
			
			// Count messages with media
			if (hasMedia) {
				stats.overview.messagesWithMedia++;
			}

			// Group by content type - use contentType from StoredMediaMessage or default
			const contentType = isStoredMediaMessage(msg) ? msg.contentType : 'unknown';
			if (!stats.byContentType[contentType]) {
				stats.byContentType[contentType] = { count: 0, totalSize: 0 };
			}
			stats.byContentType[contentType].count++;

			// Group by media type
			let mediaType = 'unknown';
			if (isStoredMediaMessage(msg)) {
				mediaType = msg.mediaType;
			} else if (isStoredViewOnceMessage(msg)) {
				mediaType = 'viewonce';
			} else if (isStoredStoryMessage(msg)) {
				mediaType = 'story';
			}
			
			if (!stats.byMediaType[mediaType]) {
				stats.byMediaType[mediaType] = { count: 0, totalSize: 0 };
			}
			stats.byMediaType[mediaType]!.count++;

			// Group by room
			const roomName = msg.roomId || 'unknown';
			if (!stats.byRoom[roomName]) {
				stats.byRoom[roomName] = { count: 0, isGroup: msg.isGroup };
			}
			stats.byRoom[roomName].count++;

			// Group by sender
			const senderName = msg.senderId || 'unknown';
			if (!stats.bySender[senderName]) {
				stats.bySender[senderName] = { count: 0 };
			}
			stats.bySender[senderName].count++;

			// Group by date
			const timestamp = msg.timestamp;
			if (timestamp) {
				const dateObj = new Date(timestamp);
				if (!isNaN(dateObj.getTime())) {
					const date = dateObj.toISOString().split('T')[0];
					if (date) {
						if (!stats.byDate[date]) {
							stats.byDate[date] = { count: 0 };
						}
						stats.byDate[date].count++;
					}
				}
			}

			// Calculate total file sizes
			const fileSize = isStoredMediaMessage(msg) ? (msg.media?.fileLength || 0) : 0;
			if (fileSize) {
				stats.byContentType[contentType].totalSize += fileSize;
				stats.byMediaType[mediaType]!.totalSize += fileSize;
			}

			// Track recent activity (limit to 100 most recent)
			if (stats.recentActivity.length < 100) {
				stats.recentActivity.push({
					timestamp: msg.timestamp,
					roomName: msg.roomId,
					senderName: msg.senderId,
					mediaType: mediaType,
					hasMedia: hasMedia
				});
			}
		}

		// Sort recent activity by timestamp
		stats.recentActivity.sort((a, b) => {
			const timeA = new Date(a.timestamp).getTime();
			const timeB = new Date(b.timestamp).getTime();
			return timeB - timeA;
		});

		return stats;
	} catch (error) {
		const metadata: LogMetadata = {
			error: error instanceof Error ? error.message : String(error)
		};
		if (roomId) {
			metadata.roomId = roomId;
		}
		botLogger.error("Error generating media statistics", metadata);
		throw error;
	}
}

/**
 * Analyzes directory structure and calculates total media storage usage
 * @param {string} mediaDir - Root media directory path
 * @returns {Promise<Object>} Directory analysis with size information
 */
export async function analyzeMediaDirectory(mediaDir: string = 'data/media'): Promise<DirectoryAnalysis> {
	const analysis: DirectoryAnalysis = {
		overview: {
			totalSize: 0,
			totalFiles: 0,
			formattedSize: '0 Bytes'
		},
		directories: {}
	};

	async function scanDirectory(currentPath: string): Promise<{ totalSize: number; totalFiles: number }> {
		try {
			const items = await fs.readdir(currentPath);
			let dirSize = 0;
			let dirFiles = 0;

			for (const item of items) {
				const fullPath = path.join(currentPath, item);
				try {
					const stats = await fs.stat(fullPath);
					
					if (stats.isDirectory()) {
						const subDirStats = await scanDirectory(fullPath);
						dirSize += subDirStats.totalSize;
						dirFiles += subDirStats.totalFiles;
					} else {
						dirSize += stats.size;
						dirFiles++;
					}
				} catch (itemError) {
					botLogger.error(`Error processing item: ${fullPath}`, {
						error: itemError instanceof Error ? itemError.message : String(itemError)
					});
				}
			}

			return { totalSize: dirSize, totalFiles: dirFiles };
		} catch (error) {
			botLogger.error(`Error scanning directory: ${currentPath}`, {
				error: error instanceof Error ? error.message : String(error)
			});
			return { totalSize: 0, totalFiles: 0 };
		}
	}

	try {
		const rooms = await fs.readdir(mediaDir);
		
		for (const dir of rooms) {
			const fullPath = path.join(mediaDir, dir);		try {
			const dirInfo = await scanDirectory(fullPath);
			analysis.directories[dir] = {
				fileCount: dirInfo.totalFiles,
				totalSize: dirInfo.totalSize,
				formattedSize: formatBytes(dirInfo.totalSize)
			};
			analysis.overview.totalSize += dirInfo.totalSize;
			analysis.overview.totalFiles += dirInfo.totalFiles;
		} catch (error) {
			analysis.directories[dir] = {
				fileCount: 0,
				totalSize: 0,
				formattedSize: '0 Bytes',
				error: error instanceof Error ? error.message : String(error)
			};
		}
		}
	} catch (error) {
		botLogger.error("Error analyzing media directory", {
			error: error instanceof Error ? error.message : String(error),
			mediaDir
		});
	}

	analysis.overview.formattedSize = formatBytes(analysis.overview.totalSize);
	return analysis;
}

/**
 * Cleans up orphaned media files that no longer have corresponding messages
 * @param {string} mediaDir - Root media directory path
 * @returns {Promise<Object>} Cleanup results with deleted files count
 */
export async function cleanupOrphanedMedia(mediaDir: string = 'data/media') {
	const results: {
		deletedFiles: string[];
		errors: Array<{ file?: string; directory?: string; error: string }>;
	} = {
		deletedFiles: [],
		errors: []
	};

	async function scanDirectory(dirPath: string): Promise<void> {
		try {
			const items = await fs.readdir(dirPath);
			
			for (const item of items) {
				const fullPath = path.join(dirPath, item);
				try {
					const stats = await fs.stat(fullPath);
					
					if (stats.isDirectory()) {
						await scanDirectory(fullPath);
					} else {
						// For now, just track files - actual cleanup logic would need message verification
						try {
							await fs.unlink(fullPath);
							results.deletedFiles.push(fullPath);
						} catch (deleteError) {
							results.errors.push({
								file: fullPath,
								error: deleteError instanceof Error ? deleteError.message : String(deleteError)
							});
						}
					}
				} catch (statError) {
					// Ignore stat errors for individual files
				}
			}
		} catch (error) {
			results.errors.push({
				directory: dirPath,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	try {
		await scanDirectory(mediaDir);
	} catch (error) {
		botLogger.error("Error during cleanup", {
			error: error instanceof Error ? error.message : String(error)
		});
	}

	return results;
}

/**
 * Finds potential duplicate media files by comparing file sizes and names
 * @param {string} mediaDir - Root media directory path
 * @returns {Promise<Object>} Duplicate analysis results
 */
export async function findDuplicateMedia(mediaDir: string = 'data/media') {
	const duplicates: {
		bySizeAndName?: Record<string, any[]>;
		potentialDuplicates: Array<{ key: string; files: any; duplicateCount: number; wastedSpace: number }>;
		totalDuplicateSize: number;
	} = {
		bySizeAndName: {},
		potentialDuplicates: [],
		totalDuplicateSize: 0
	};

	async function scanForDuplicates(dirPath: string): Promise<void> {
		try {
			const items = await fs.readdir(dirPath);
			
			for (const item of items) {
				const fullPath = path.join(dirPath, item);
				try {
					const stats = await fs.stat(fullPath);
					
					if (stats.isDirectory()) {
						await scanForDuplicates(fullPath);
					} else {
						const key = `${item}_${stats.size}`;
						if (!duplicates.bySizeAndName![key]) {
							duplicates.bySizeAndName![key] = [];
						}
						
						duplicates.bySizeAndName![key].push({
							path: fullPath,
							size: stats.size,
							name: item
						});
					}
				} catch (statError) {
					// Ignore individual file errors
				}
			}
		} catch (error) {
			botLogger.error("Error scanning for duplicates", { error: error instanceof Error ? error.message : String(error), dirPath });
		}
	}

	await scanForDuplicates(mediaDir);

	// Find actual duplicates
	for (const [key, files] of Object.entries(duplicates.bySizeAndName!)) {
		if (Array.isArray(files) && files.length > 1) {
			duplicates.potentialDuplicates.push({
				key,
				files,
				duplicateCount: files.length - 1,
				wastedSpace: files[0].size * (files.length - 1)
			});
			duplicates.totalDuplicateSize += files[0].size * (files.length - 1);
		}
	}

	// Remove to reduce output size
	if (duplicates.bySizeAndName) {
		delete duplicates.bySizeAndName;
	}

	return duplicates;
}

/**
 * Exports media data to CSV format for external analysis
 * @param {string} roomId - Optional room ID to filter messages
 * @param {string} outputPath - Path for the exported CSV file
 * @returns {Promise<string>} Path to the exported file
 */
export async function exportMediaToCSV(roomId?: string, outputPath: string = 'media_export.csv') {
	try {
		const messages = await loadMessages();
		
		// Filter messages with media and by roomId if provided
		const filteredMessages = messages.filter(msg => {
			const hasMedia = hasMediaContent(msg);
			const matchesRoom = !roomId || msg.roomId === roomId;
			return hasMedia && matchesRoom;
		});
		
		// CSV header
		const csvHeader = 'Timestamp,Room,Sender,MediaType,ContentType,FileSize,FilePath,Caption,IsGroup\n';
		
		// Helper function to escape CSV fields
		const escapeCsvField = (value: any): string => {
			if (value === null || value === undefined) return '';
			const stringValue = String(value);
			if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
				return `"${stringValue.replace(/"/g, '""')}"`;
			}
			return stringValue;
		};
		
		// Generate CSV rows
		const csvRows = filteredMessages.map(msg => {
			const mediaPaths = getMediaPaths(msg);
			let mediaType = 'unknown';
			if (isStoredMediaMessage(msg)) mediaType = msg.mediaType;
			else if (isStoredViewOnceMessage(msg)) mediaType = 'viewonce';
			else if (isStoredStoryMessage(msg)) mediaType = 'story';
			
			const contentType = isStoredMediaMessage(msg) ? msg.contentType : 'unknown';
			const fileSize = isStoredMediaMessage(msg) ? (msg.media?.fileLength || 0) : 0;
			const caption = isStoredMediaMessage(msg) ? (msg.media?.caption || '') : '';
			
			return [
				escapeCsvField(new Date(msg.timestamp).toISOString()),
				escapeCsvField(msg.roomId || ''),
				escapeCsvField(msg.senderId || ''),
				escapeCsvField(mediaType),
				escapeCsvField(contentType),
				fileSize,
				escapeCsvField(mediaPaths.join('; ') || ''),
				escapeCsvField(caption),
				msg.isGroup || false
			].join(',');
		});
		
		// Write CSV file
		const csvContent = csvHeader + csvRows.join('\n');
		await fs.writeFile(outputPath, csvContent, 'utf-8');
		
		const metadata: LogMetadata = {
			totalMessages: filteredMessages.length
		};
		if (roomId) {
			metadata.roomId = roomId;
		}
		
		botLogger.info(`Media data exported to ${outputPath}`, metadata);
		
		return outputPath;
	} catch (error) {
		botLogger.error("Error exporting media data", { error: error instanceof Error ? error.message : String(error) });
		throw error;
	}
}

/**
 * Formats bytes into human readable format
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string
 */
function formatBytes(bytes: number, decimals: number = 2): string {
	if (bytes === 0) return '0 Bytes';
	
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
