#!/usr/bin/env node

/**
 * Media Management CLI Tool
 * Usage: node mediaManager.js [command] [options]
 */

import {
	getMediaStats,
	analyzeMediaDirectory,
	cleanupOrphanedMedia,
	findDuplicateMedia,
	exportMediaToCSV
} from './src/utils/mediaManager.js';

// Helper function to format bytes
function formatBytes(bytes: number, decimals: number = 2): string {
	if (bytes === 0) return '0 Bytes';
	
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const commands: Record<string, string> = {
	stats: 'Show storage statistics',
	analyze: 'Analyze media directories',
	cleanup: 'Clean up old media files (dry run by default)',
	duplicates: 'Find duplicate media files',
	export: 'Export media data to CSV',
	help: 'Show this help message'
};

function showHelp(): void {
	console.log('📁 Media Management CLI Tool\n');
	console.log('Usage: node mediaManager.js [command] [options]\n');
	console.log('Commands:');
	
	Object.entries(commands).forEach(([cmd, desc]) => {
		console.log(`  ${cmd.padEnd(12)} ${desc}`);
	});
	
	console.log('\nOptions:');
	console.log('  --room=ID    Filter by specific room ID');
	console.log('  --execute    Actually perform cleanup (not just dry run)');
	console.log('  --format=csv Export format (default: csv)');
	console.log('\nExamples:');
	console.log('  node mediaManager.js stats');
	console.log('  node mediaManager.js stats --room=12345@s.whatsapp.net');
	console.log('  node mediaManager.js cleanup --execute');
	console.log('  node mediaManager.js export --room=12345@s.whatsapp.net');
}

async function showStats(roomId?: string): Promise<void> {
	console.log('📊 Media Storage Statistics');
	console.log('==========================================\n');

	const stats = await getMediaStats(roomId);

	console.log('📈 Overview:');
	console.log(`  Total Messages: ${stats.overview.totalMessages.toLocaleString()}`);
	console.log(`  Messages with Media: ${stats.overview.messagesWithMedia.toLocaleString()}`);
	console.log(`  Estimated Total Size: ${formatBytes(stats.overview.totalEstimatedSize)}\n`);

	console.log('📂 By Content Type:');
	Object.entries(stats.byContentType)
		.sort(([,a], [,b]) => b.count - a.count)
		.slice(0, 10)
		.forEach(([type, data]) => {
			console.log(`  ${type.padEnd(15)} ${String(data.count).padStart(6)} files ${formatBytes(data.totalSize).padStart(10)}`);
		});

	console.log('\n🎯 By Media Type:');
	Object.entries(stats.byMediaType)
		.sort(([,a], [,b]) => b.count - a.count)
		.forEach(([type, data]) => {
			console.log(`  ${type.padEnd(15)} ${String(data.count).padStart(6)} files ${formatBytes(data.totalSize).padStart(10)}`);
		});

	console.log('\n💬 Top 10 Most Active Rooms:');
	Object.entries(stats.byRoom)
		.sort(([,a], [,b]) => b.count - a.count)
		.slice(0, 10)
		.forEach(([room, data]) => {
			const groupIcon = data.isGroup ? '👥' : '👤';
			console.log(`  ${groupIcon} ${room.slice(0, 30).padEnd(32)} ${String(data.count).padStart(6)} messages`);
		});
}

async function analyzeDirectories(): Promise<void> {
	console.log('🔍 Media Directory Analysis');
	console.log('==========================================\n');

	const analysis = await analyzeMediaDirectory();

	console.log('📊 Overview:');
	console.log(`  Total Size: ${analysis.overview.formattedSize}`);
	console.log(`  Total Files: ${analysis.overview.totalFiles.toLocaleString()}\n`);

	console.log('📁 By Directory:');
	Object.entries(analysis.directories)
		.sort(([,a], [,b]) => (b.totalSize || 0) - (a.totalSize || 0))
		.slice(0, 20)
		.forEach(([dir, data]) => {
			if (typeof data === 'object' && 'totalSize' in data && 'totalFiles' in data) {
				console.log(`  ${dir.slice(0, 40).padEnd(42)} ${formatBytes(data.totalSize).padStart(10)} (${data.totalFiles} files)`);
			}
		});
}

async function cleanupFiles(): Promise<void> {
	console.log('🧹 Media Cleanup');
	console.log('==========================================\n');

	const results = await cleanupOrphanedMedia();

	console.log(`📊 Cleanup Results:`);
	console.log(`  Files Deleted: ${results.deletedFiles?.length || 0}`);
	console.log(`  Errors: ${results.errors?.length || 0}`);

	if (results.errors.length > 0) {
		console.log('\n❌ Errors:');
		results.errors.slice(0, 5).forEach(error => {
			console.log(`  ${error.file || error.directory}: ${error.error}`);
		});
		if (results.errors.length > 5) {
			console.log(`  ... and ${results.errors.length - 5} more errors`);
		}
	}
}

async function findDuplicates(): Promise<void> {
	console.log('🔍 Duplicate Media Analysis');
	console.log('==========================================\n');

	const duplicates = await findDuplicateMedia();

	console.log(`📊 Duplicate Analysis:`);
	console.log(`  Potential Duplicates: ${duplicates.potentialDuplicates.length}`);
	console.log(`  Wasted Space: ${formatBytes(duplicates.totalDuplicateSize)}\n`);

	if (duplicates.potentialDuplicates.length > 0) {
		console.log('🔍 Top Duplicates (by wasted space):');
		duplicates.potentialDuplicates
			.sort((a, b) => b.wastedSpace - a.wastedSpace)
			.slice(0, 10)
			.forEach(dup => {
				console.log(`  ${formatBytes(dup.wastedSpace).padStart(10)} - ${dup.duplicateCount + 1} copies of ${dup.key}`);
			});
	}
}

async function exportData(): Promise<void> {
	console.log('📤 Exporting Media Data');
	console.log('==========================================\n');

	const args = process.argv.slice(2);
	const roomId = args.find((arg: string) => arg.startsWith('--room='))?.split('=')[1];

	const exportData = await exportMediaToCSV(roomId, 'media_export.csv');

	console.log(`✅ Data exported successfully:`);
	console.log(`  File: ${exportData}`);
	console.log(`  Room filter: ${roomId || 'All rooms'}`);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const command = args[0];
	const roomId = args.find((arg: string) => arg.startsWith('--room='))?.split('=')[1];

	if (!command || command === 'help') {
		showHelp();
		return;
	}

	try {
		switch (command) {
			case 'stats':
				await showStats(roomId);
				break;
			case 'analyze':
				await analyzeDirectories();
				break;
			case 'cleanup':
				await cleanupFiles();
				break;
			case 'duplicates':
				await findDuplicates();
				break;
			case 'export':
				await exportData();
				break;
			default:
				console.error(`❌ Unknown command: ${command}`);
				console.log('Use "help" to see available commands.\n');
				showHelp();
				process.exit(1);
		}
	} catch (error) {
		console.error('❌ Error executing command:', error);
		process.exit(1);
	}
}

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}
