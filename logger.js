import winston from 'winston';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Custom Winston transport for room-based logging
 * Logs messages to separate files based on roomId
 */
class RoomTransport extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.dirname = opts.dirname || './logs/rooms';
        this.format = opts.format || winston.format.simple();
        this._ensureLogDir();
    }

    /**
     * Ensures the log directory exists
     */
    async _ensureLogDir() {
        try {
            await fs.mkdir(this.dirname, { recursive: true });
        } catch (error) {
            // Directory already exists or permission error
        }
    }

    /**
     * Sanitizes roomId for use as filename
     * @param {string} roomId - The room ID to sanitize
     * @returns {string} Sanitized room ID
     */
    _sanitizeRoomId(roomId) {
        return roomId.replace(/[^a-zA-Z0-9@.-]/g, '_');
    }

    /**
     * Main logging method
     * @param {Object} info - Log information object
     * @param {Function} callback - Callback function
     */
    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        // Only log if roomId is present in metadata
        if (info.roomId) {
            const sanitizedRoomId = this._sanitizeRoomId(info.roomId);
            const filename = path.join(this.dirname, `${sanitizedRoomId}.log`);
            const formattedMessage = this.format.transform(info);
            
            if (formattedMessage) {
                const logLine = typeof formattedMessage === 'string' 
                    ? formattedMessage 
                    : formattedMessage[Symbol.for('message')] || JSON.stringify(formattedMessage);
                
                fs.appendFile(filename, logLine + '\n').catch(err => {
                    this.emit('error', err);
                });
            }
        }

        callback();
    }
}

/**
 * Custom format for logging with emoji and HH:mm:ss timestamp
 */
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const emoji = getEmojiForLevel(level);
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${emoji} [${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
    })
);

/**
 * Returns appropriate emoji for log level
 * @param {string} level - The log level
 * @returns {string} Emoji for the log level
 */
function getEmojiForLevel(level) {
    const emojiMap = {
        error: '❌',
        warn: '⚠️',
        info: 'ℹ️',
        http: '🌐',
        verbose: '📝',
        debug: '🐛',
        silly: '🤪'
    };
    return emojiMap[level] || 'ℹ️';
}

/**
 * Winston logger instance with custom configuration
 */
const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        // File transport for error logs
        new winston.transports.File({
            filename: './logs/error.log',
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        // File transport for all logs (JSON format)
        new winston.transports.File({
            filename: './logs/combined.log',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        // File transport for readable logs (human-friendly format)
        new winston.transports.File({
            filename: './logs/readable.log',
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const emoji = getEmojiForLevel(level);
                    const metaStr = Object.keys(meta).length ? `\n    ${JSON.stringify(meta, null, 2).split('\n').join('\n    ')}` : '';
                    return `${emoji} [${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
                })
            )
        }),
        // Custom room-based transport for logging by roomId
        new RoomTransport({
            dirname: './logs/rooms',
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const emoji = getEmojiForLevel(level);
                    // Remove roomId from meta display since it's already in the filename
                    const { roomId, ...displayMeta } = meta;
                    const metaStr = Object.keys(displayMeta).length ? `\n    ${JSON.stringify(displayMeta, null, 2).split('\n').join('\n    ')}` : '';
                    return `${emoji} [${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
                })
            )
        })
    ]
});

/**
 * Custom logger methods with specific emojis for WhatsApp bot operations
 */
export const botLogger = {
    // Connection related
    connection: (message, meta = {}) => logger.info(`🔗 ${message}`, meta),
    qr: (message, meta = {}) => logger.info(`📱 ${message}`, meta),
    
    // Message related
    messageReceived: (message, meta = {}) => logger.info(`📥 ${message}`, meta),
    messageSent: (message, meta = {}) => logger.info(`📤 ${message}`, meta),
    
    // Media related
    mediaProcessing: (message, meta = {}) => logger.info(`🖼️ ${message}`, meta),
    viewOnceDetected: (message, meta = {}) => logger.info(`🕵️ ${message}`, meta),
    mediaSaved: (message, meta = {}) => logger.info(`💾 ${message}`, meta),
    
    // File operations
    fileOperation: (message, meta = {}) => logger.info(`📁 ${message}`, meta),
    
    // Database operations
    database: (message, meta = {}) => logger.info(`🗄️ ${message}`, meta),
    
    // Error related
    error: (message, meta = {}) => logger.error(`❌ ${message}`, meta),
    warning: (message, meta = {}) => logger.warn(`⚠️ ${message}`, meta),
    
    // Success operations
    success: (message, meta = {}) => logger.info(`✅ ${message}`, meta),
    
    // General info
    info: (message, meta = {}) => logger.info(`ℹ️ ${message}`, meta),
    debug: (message, meta = {}) => logger.debug(`🐛 ${message}`, meta),
    
    // Bot lifecycle
    startup: (message, meta = {}) => logger.info(`🚀 ${message}`, meta),
    shutdown: (message, meta = {}) => logger.info(`🛑 ${message}`, meta),
    
    // Processing status
    processing: (message, meta = {}) => logger.info(`⚙️ ${message}`, meta),
    completed: (message, meta = {}) => logger.info(`✨ ${message}`, meta),
    
    // Room-specific logging methods
    roomMessage: (roomId, message, meta = {}) => logger.info(`💬 ${message}`, { ...meta, roomId }),
    roomActivity: (roomId, message, meta = {}) => logger.info(`🔄 ${message}`, { ...meta, roomId }),
    roomError: (roomId, message, meta = {}) => logger.error(`❌ ${message}`, { ...meta, roomId }),
    roomWarning: (roomId, message, meta = {}) => logger.warn(`⚠️ ${message}`, { ...meta, roomId }),
    roomInfo: (roomId, message, meta = {}) => logger.info(`ℹ️ ${message}`, { ...meta, roomId })
};

export default logger;
