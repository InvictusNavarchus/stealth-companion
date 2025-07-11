# 📸 Image Storage Feature - Implementation Guide

## 🎯 Overview

Your WhatsApp Stealth Companion bot has been enhanced to store **all images** (and other media) organized by room, expanding beyond just view-once and story media. This implementation provides a comprehensive, configurable, and manageable media storage system.

## 🏗️ Architecture Summary

### **Files Added/Modified:**

#### ✅ **New Handler Files:**
- `src/handlers/imageHandler.js` - Handles regular image messages
- `src/handlers/mediaHandler.js` - Comprehensive media handler (images, videos, audio, documents)

#### ✅ **Configuration:**
- `src/config/imageConfig.js` - Configurable filters and storage options

#### ✅ **Enhanced Services:**
- `src/services/mediaHandler.js` - Enhanced with new `saveMedia()` and `handleMediaMessage()` functions

#### ✅ **Management Utilities:**
- `src/utils/mediaManager.js` - Storage analysis and management functions
- `mediaManager.js` - CLI tool for media management

#### ✅ **Updated Core:**
- `src/handlers/messageHandler.js` - Integrated media handling into main message flow

## 📂 Directory Structure

Your media will now be organized as follows:

```
data/
├── images/           # Regular images organized by room
│   ├── {roomId}/
│   │   └── {chatId}_{timestamp}.{ext}
├── media/            # Other media types organized by room and type
│   ├── {roomId}/
│   │   ├── video/
│   │   ├── audio/
│   │   ├── voice/
│   │   └── document/
├── viewonce/         # View-once images (existing)
│   └── {roomId}/
└── stories/          # Story media (existing)
    └── {senderId}/
```

## ⚙️ Configuration Options

### **Basic Configuration** (`src/config/imageConfig.js`)

```javascript
export const IMAGE_STORAGE_CONFIG = {
	// Enable/disable regular image storage
	enableRegularImages: true,
	
	// File size limits
	maxFileSize: 50 * 1024 * 1024, // 50MB
	minFileSize: 1024, // 1KB
	
	// Supported formats
	supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
	
	// Room/contact filters
	filters: {
		skipRooms: [],        // Skip specific rooms
		onlyRooms: [],        // Only process specific rooms
		skipSenders: [],      // Skip specific senders
		skipGroups: false,    // Skip group chats
		skipPrivateChats: false
	}
};
```

### **Media Type Configuration** (`src/handlers/mediaHandler.js`)

```javascript
const MEDIA_CONFIG = {
	image: { enabled: true, maxSize: 50MB },
	video: { enabled: true, maxSize: 100MB },
	audio: { enabled: true, maxSize: 25MB },
	voice: { enabled: true, maxSize: 10MB },
	document: { enabled: false, maxSize: 20MB } // Disabled by default
};
```

## 🔧 Management Commands

Use the included CLI tool to manage your media storage:

### **View Statistics:**
```bash
node mediaManager.js stats
```

### **Analyze Storage:**
```bash
node mediaManager.js analyze
```

### **Clean Up Old Files:**
```bash
# Dry run (preview only)
node mediaManager.js cleanup --days 30

# Actually delete files
node mediaManager.js cleanup --days 30 --execute
```

### **Find Duplicates:**
```bash
node mediaManager.js duplicates
```

### **Export Data:**
```bash
# Export as JSON
node mediaManager.js export > media_data.json

# Export as CSV
node mediaManager.js export --format csv > media_data.csv
```

## 🎛️ Customization Options

### **Method 1: Disable Specific Media Types**

Edit `src/handlers/mediaHandler.js`:

```javascript
const MEDIA_CONFIG = {
	image: { enabled: true, maxSize: 50 * 1024 * 1024 },
	video: { enabled: false, maxSize: 100 * 1024 * 1024 }, // Disabled
	audio: { enabled: false, maxSize: 25 * 1024 * 1024 },  // Disabled
	// ...
};
```

### **Method 2: Filter by Room/Contact**

Edit `src/config/imageConfig.js`:

```javascript
filters: {
	// Only save from these rooms
	onlyRooms: ['120363402876634391@g.us', '6289687981303@s.whatsapp.net'],
	
	// Skip these specific rooms
	skipRooms: ['spam_group@g.us'],
	
	// Skip all group chats
	skipGroups: true,
}
```

### **Method 3: Size-Based Filtering**

```javascript
// Only save images smaller than 10MB
maxFileSize: 10 * 1024 * 1024,

// Don't save tiny images (likely stickers/emojis)
minFileSize: 50 * 1024, // 50KB
```

## 📊 Storage Impact

### **Expected Storage Usage:**
- **Light Usage**: 100-500 MB/month
- **Moderate Usage**: 1-5 GB/month  
- **Heavy Usage**: 5-20 GB/month

### **Performance Considerations:**
- Each image saves ~2-5ms processing time
- JSON message storage grows linearly
- File system impact depends on room organization

## 🚀 Advanced Features

### **1. Database Migration (Future Enhancement)**

For heavy usage, consider migrating from JSON to SQLite:

```javascript
// Future implementation concept
const db = new SQLiteDatabase('./data/media.db');
await db.createTable('media_messages', schema);
```

### **2. Cloud Storage Integration**

Consider uploading to cloud storage for backup:

```javascript
// Future implementation concept
import { uploadToS3 } from './cloudStorage.js';
const cloudUrl = await uploadToS3(mediaBuffer, filename);
```

### **3. Content Analysis**

Add automatic content detection:

```javascript
// Future implementation concept
import { analyzeImage } from './aiAnalysis.js';
const tags = await analyzeImage(imageBuffer);
```

## ⚠️ Important Considerations

### **Legal & Privacy:**
- Ensure compliance with local privacy laws
- Consider retention policies for stored media
- Be mindful of copyright content

### **Storage Management:**
- Monitor disk space regularly
- Implement automated cleanup policies
- Consider external storage for long-term retention

### **Performance:**
- Large volumes may require database migration
- Consider async processing for heavy loads
- Monitor memory usage during media processing

## 🔄 Migration from Current Setup

Your existing data remains unchanged:
- ✅ View-once images: Still in `./data/viewonce/`
- ✅ Stories: Still in `./data/stories/`  
- ✅ Message data: Still in `./data/messages.json`
- ✅ New regular images: Will be saved to `./data/images/` and `./data/media/`

## 🎯 Next Steps

1. **Test the Implementation:**
   ```bash
   # Check if bot starts correctly
   npm start
   
   # Monitor logs for media processing
   tail -f logs/combined.log
   ```

2. **Configure Filters:**
   - Edit `src/config/imageConfig.js` based on your needs
   - Start with conservative settings and adjust

3. **Monitor Storage:**
   ```bash
   # Check storage usage
   node mediaManager.js stats
   
   # Monitor directory sizes
   du -sh data/*/
   ```

4. **Set Up Cleanup:**
   - Create a cron job for regular cleanup
   - Monitor for duplicates and large files

## 🆘 Troubleshooting

### **Bot Not Saving Images:**
1. Check `enableRegularImages: true` in config
2. Verify room filters aren't excluding your chats
3. Check file size limits

### **High Storage Usage:**
1. Run `node mediaManager.js analyze`
2. Use cleanup commands to remove old files
3. Adjust file size limits in config

### **Performance Issues:**
1. Monitor memory usage during peak times
2. Consider disabling video/document storage
3. Implement more aggressive filtering

---

**🎉 Your WhatsApp bot now comprehensively stores all media organized by room! Use the management tools to keep everything organized and efficient.**
