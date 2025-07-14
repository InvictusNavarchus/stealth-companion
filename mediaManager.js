#!/usr/bin/env node

/**
 * Media Management CLI Tool
 * Usage: node mediaManager.js [command] [options]
 */

import { 
	getStorageStatistics, 
	analyzeMediaDirectories, 
	cleanupOldMedia, 
	findDuplicateMedia, 
	exportMediaData 
} from './src/utils/mediaManager.js';

const commands = {
	stats: 'Show storage statistics',
	analyze: 'Analyze media directories',
	cleanup: 'Clean up old media files (dry run by default)',
	duplicates: 'Find duplicate media files',
	export: 'Export media data to JSON/CSV'
};

function showHelp() {
	console.log('🔧 Media Storage Manager');
	console.log('========================\n');
	console.log('Available commands:');
	Object.entries(commands).forEach(([cmd, desc]) => {
		console.log(`  ${cmd.padEnd(12)} - ${desc}`);
	});
	console.log('\nExamples:');
	console.log('  node mediaManager.js stats');
	console.log('  node mediaManager.js cleanup --days 30 --execute');
	console.log('  node mediaManager.js export --format csv > media_export.csv');
}

function formatBytes(bytes) {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function runStats() {
	console.log('📊 Storage Statistics');
	console.log('====================\n');
	
	const stats = await getStorageStatistics();
	
	console.log('📈 Overview:');
	console.log(`  Total Messages: ${stats.overview.totalMessages}`);
	console.log(`  Messages with Media: ${stats.overview.messagesWithMedia}`);
	console.log(`  Estimated Size: ${formatBytes(stats.overview.totalEstimatedSize)}\n`);
	
	console.log('📂 By Content Type:');
	Object.entries(stats.byContentType).forEach(([type, data]) => {
		console.log(`  ${type}: ${data.count} files (${formatBytes(data.totalSize)})`);
	});
	
	console.log('\n🏠 Top Rooms:');
	const topRooms = Object.entries(stats.byRoom)
		.sort((a, b) => b[1].count - a[1].count)
		.slice(0, 10);
	topRooms.forEach(([room, data]) => {
		const groupIcon = data.isGroup ? '👥' : '👤';
		console.log(`  ${groupIcon} ${room}: ${data.count} files`);
	});
	
	console.log('\n👤 Top Senders:');
	const topSenders = Object.entries(stats.bySender)
		.sort((a, b) => b[1].count - a[1].count)
		.slice(0, 10);
	topSenders.forEach(([sender, data]) => {
		console.log(`  ${sender}: ${data.count} files`);
	});
}

async function runAnalyze() {
	console.log('🔍 Directory Analysis');
	console.log('====================\n');
	
	const analysis = await analyzeMediaDirectories();
	
	console.log('📊 Overview:');
	console.log(`  Total Size: ${analysis.overview.formattedSize}`);
	console.log(`  Total Files: ${analysis.overview.totalFiles}\n`);
	
	console.log('📁 Directory Breakdown:');
	Object.entries(analysis.directories).forEach(([dir, info]) => {
		if (info.error) {
			console.log(`  ${dir}: Error - ${info.error}`);
		} else {
			console.log(`  ${dir}: ${info.fileCount} files (${info.formattedSize})`);
		}
	});
}

async function runCleanup(args) {
	const days = parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1]) || 30;
	const execute = args.includes('--execute');
	
	console.log(`🧹 Media Cleanup ${execute ? '' : '(DRY RUN)'}`);
	console.log('==========================================\n');
	
	const results = await cleanupOldMedia(days, !execute);
	
	console.log(`📊 Cleanup Results (older than ${days} days):`);
	console.log(`  Files Scanned: ${results.scanned}`);
	console.log(`  Files to Delete: ${results.toDelete}`);
	console.log(`  Space to Save: ${results.formattedSpaceSaved}`);
	
	if (execute) {
		console.log(`  Files Deleted: ${results.deletedFiles.length}`);
		console.log(`  Errors: ${results.errors.length}`);
	} else {
		console.log('\n⚠️  This was a dry run. Use --execute to actually delete files.');
	}
	
	if (results.errors.length > 0) {
		console.log('\n❌ Errors:');
		results.errors.slice(0, 5).forEach(error => {
			console.log(`  ${error.file || error.directory}: ${error.error}`);
		});
	}
}

async function runDuplicates() {
	console.log('🔍 Duplicate Analysis');
	console.log('====================\n');
	
	const duplicates = await findDuplicateMedia();
	
	console.log(`📊 Results:`);
	console.log(`  Potential Duplicates: ${duplicates.potentialDuplicates.length} groups`);
	console.log(`  Wasted Space: ${duplicates.formattedTotalWaste}\n`);
	
	if (duplicates.potentialDuplicates.length > 0) {
		console.log('🔍 Top Duplicate Groups:');
		duplicates.potentialDuplicates
			.sort((a, b) => b.wastedSpace - a.wastedSpace)
			.slice(0, 10)
			.forEach((group, index) => {
				console.log(`\n${index + 1}. ${group.key}`);
				console.log(`   Duplicates: ${group.duplicateCount}`);
				console.log(`   Wasted Space: ${formatBytes(group.wastedSpace)}`);
				group.files.slice(0, 3).forEach(file => {
					console.log(`   📄 ${file.path}`);
				});
				if (group.files.length > 3) {
					console.log(`   ... and ${group.files.length - 3} more`);
				}
			});
	}
}

async function runExport(args) {
	const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'json';
	
	console.log(`📤 Exporting Media Data (${format.toUpperCase()})`);
	console.log('=======================================\n');
	
	const exportData = await exportMediaData(format);
	console.log(exportData);
}

async function main() {
	const [,, command, ...args] = process.argv;
	
	if (!command || command === 'help' || command === '--help') {
		showHelp();
		return;
	}
	
	try {
		switch (command) {
			case 'stats':
				await runStats();
				break;
			case 'analyze':
				await runAnalyze();
				break;
			case 'cleanup':
				await runCleanup(args);
				break;
			case 'duplicates':
				await runDuplicates();
				break;
			case 'export':
				await runExport(args);
				break;
			default:
				console.error(`❌ Unknown command: ${command}`);
				showHelp();
				process.exit(1);
		}
	} catch (error) {
		console.error(`❌ Error: ${error.message}`);
		process.exit(1);
	}
}

main();
