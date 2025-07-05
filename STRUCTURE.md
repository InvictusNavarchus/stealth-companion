# Stealth Companion - Project Structure

This document outlines the modular structure of the Stealth Companion WhatsApp Bot codebase.

## 📁 Project Structure

```
stealth-companion/
├── index.js                      # Main entry point
├── logger.js                     # Logging configuration
├── package.json                  # Project dependencies
├── src/                          # Source code modules
│   ├── config/
│   │   └── index.js              # Configuration settings
│   ├── services/
│   │   ├── messageStorage.js     # Message persistence services
│   │   └── mediaHandler.js       # Media file operations
│   ├── utils/
│   │   └── storyDetector.js      # Story/status detection utilities
│   └── handlers/
│       ├── eventHandler.js       # Main event listener setup
│       ├── messageHandler.js     # Message processing logic
│       ├── viewOnceHandler.js    # View once message handling
│       ├── storyHandler.js       # Story/status message handling
│       ├── connectionHandler.js  # Connection management
│       └── processHandler.js     # Process signal handling
├── data/                         # Data storage
│   ├── messages.json            # Message history
│   ├── images/                  # Regular images
│   ├── viewonce/                # View once images
│   └── stories/                 # Story/status media
├── logs/                        # Log files
└── session/                     # WhatsApp session data
```

## 🔧 Module Descriptions

### Core Entry Point
- **`index.js`** - Streamlined main file that initializes the bot and coordinates all modules

### Configuration
- **`src/config/index.js`** - Centralized configuration for WhatsApp client and reconnection settings

### Services
- **`src/services/messageStorage.js`** - Handles loading and saving messages to JSON files
- **`src/services/mediaHandler.js`** - Manages image, video, audio and media file operations for regular messages, view once content, and stories

### Utilities
- **`src/utils/storyDetector.js`** - Dedicated detector for identifying and validating story/status messages and their media content

### Handlers
- **`src/handlers/eventHandler.js`** - Sets up all WhatsApp event listeners
- **`src/handlers/messageHandler.js`** - Processes incoming messages and determines actions
- **`src/handlers/viewOnceHandler.js`** - Specialized handling for view once messages
- **`src/handlers/storyHandler.js`** - Specialized handling for story/status messages and media
- **`src/handlers/connectionHandler.js`** - Manages connection states and reconnection logic
- **`src/handlers/processHandler.js`** - Handles process signals for graceful shutdown

## 🚀 Benefits of This Structure

1. **Separation of Concerns** - Each module has a single, well-defined responsibility
2. **Maintainability** - Changes to specific functionality are isolated to relevant modules
3. **Testability** - Individual modules can be tested independently
4. **Reusability** - Services and handlers can be reused across different parts of the application
5. **Readability** - The main entry point is now clean and easy to understand

## 🔄 Import Flow

```
index.js
├── imports config from src/config/
├── imports setupEventListeners from src/handlers/eventHandler.js
└── imports setupProcessHandlers from src/handlers/processHandler.js

eventHandler.js
├── imports handleMessage from messageHandler.js
└── imports handleConnection from connectionHandler.js

messageHandler.js
├── imports storage functions from src/services/messageStorage.js
├── imports view once functions from viewOnceHandler.js
└── imports story functions from storyHandler.js

viewOnceHandler.js
└── imports media functions from src/services/mediaHandler.js

storyHandler.js
├── imports storage functions from src/services/messageStorage.js
├── imports media functions from src/services/mediaHandler.js
└── imports detection utilities from src/utils/storyDetector.js

connectionHandler.js
├── imports config from src/config/
└── imports eventHandler.js (dynamic import to avoid circular dependency)
```

## 📝 Key Features Preserved

- ✅ View once message detection and extraction
- ✅ Story/status message detection and media saving
- ✅ Automatic reconnection with retry logic
- ✅ Comprehensive logging throughout all modules
- ✅ Graceful process shutdown handling
- ✅ Media file storage in organized directories (images, viewonce, stories)
- ✅ Message persistence to JSON files
- ✅ Dedicated detection utilities for different content types

## 🛠️ Future Extensibility

This modular structure makes it easy to:
- Add new message handlers for different content types (polls, locations, contacts, etc.)
- Implement additional storage backends (databases, cloud storage)
- Extend media processing capabilities (compression, format conversion)
- Add new bot commands and features
- Integrate with external APIs or databases
- Create specialized detectors for new WhatsApp features
- Implement content filtering and moderation
