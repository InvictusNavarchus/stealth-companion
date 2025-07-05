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
│   └── handlers/
│       ├── eventHandler.js       # Main event listener setup
│       ├── messageHandler.js     # Message processing logic
│       ├── viewOnceHandler.js    # View once message handling
│       ├── connectionHandler.js  # Connection management
│       └── processHandler.js     # Process signal handling
├── data/                         # Data storage
│   ├── messages.json            # Message history
│   ├── images/                  # Regular images
│   └── viewonce/                # View once images
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
- **`src/services/mediaHandler.js`** - Manages image and media file operations

### Handlers
- **`src/handlers/eventHandler.js`** - Sets up all WhatsApp event listeners
- **`src/handlers/messageHandler.js`** - Processes incoming messages and determines actions
- **`src/handlers/viewOnceHandler.js`** - Specialized handling for view once messages
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
└── imports view once functions from viewOnceHandler.js

viewOnceHandler.js
└── imports media functions from src/services/mediaHandler.js

connectionHandler.js
├── imports config from src/config/
└── imports eventHandler.js (dynamic import to avoid circular dependency)
```

## 📝 Key Features Preserved

- ✅ View once message detection and extraction
- ✅ Automatic reconnection with retry logic
- ✅ Comprehensive logging throughout all modules
- ✅ Graceful process shutdown handling
- ✅ Media file storage in organized directories
- ✅ Message persistence to JSON files

## 🛠️ Future Extensibility

This modular structure makes it easy to:
- Add new message handlers for different content types
- Implement additional storage backends
- Extend media processing capabilities
- Add new bot commands and features
- Integrate with external APIs or databases
