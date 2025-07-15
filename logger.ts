import winston from 'winston';
import Transport from 'winston-transport';
import { promises as fs } from 'fs';
import path from 'path';
import { RoomTransportOptions, LogInfo, BotLogger, LogMetadata } from './types/index.js';

/**
 * Custom Winston transport for room-based logging
 * Logs messages to separate files based on roomId
 */
class RoomTransport extends Transport {
    private dirname: string;
    private logFormat: winston.Logform.Format;
    private _dirReady: Promise<void>;

    constructor(opts: RoomTransportOptions = {}) {
        super(opts);
        this.dirname = opts.dirname || './logs/rooms';
        this.logFormat = opts.format as winston.Logform.Format || winston.format.simple();
        // Initialize directory ready promise to handle race condition
        this._dirReady = this._ensureLogDir();
    }

    /**
     * Ensures the log directory exists
     * @returns {Promise<void>} Promise that resolves when directory is ready
     */
    private async _ensureLogDir(): Promise<void> {
        try {
            await fs.mkdir(this.dirname, { recursive: true });
        } catch (error) {
            // Check if error is due to directory already existing
            if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
                // Directory already exists, this is fine
                return;
            }
            // For other errors like permission issues, log and rethrow
            console.error('Failed to create log directory:', error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    /**
     * Sanitizes roomId for use as filename
     * @param {string} roomId - The room ID to sanitize
     * @returns {string} Sanitized room ID
     */
    private _sanitizeRoomId(roomId: string): string {
        return roomId.replace(/[^a-zA-Z0-9@.-]/g, '_');
    }

    /**
     * Main logging method
     * @param {Object} info - Log information object
     * @param {Function} callback - Callback function
     */
    override async log(info: LogInfo, callback: () => void): Promise<void> {
        setImmediate(() => {
            this.emit('logged', info);
        });

        try {
            // Wait for directory to be ready before proceeding
            await this._dirReady;

            // Only log if roomId is present in metadata
            if (info.roomId) {
                const sanitizedRoomId = this._sanitizeRoomId(info.roomId);
                const filename = path.join(this.dirname, `${sanitizedRoomId}.log`);
                const formattedMessage = this.logFormat.transform(info as winston.Logform.TransformableInfo);

                if (formattedMessage) {
                    const logLine = typeof formattedMessage === 'string'
                        ? formattedMessage
                        : (formattedMessage as Record<symbol, string>)[Symbol.for('message')] || JSON.stringify(formattedMessage);

                    // Wait for file write to complete before calling callback
                    await fs.appendFile(filename, logLine + '\n');
                }
            }

            // Call callback only after successful completion
            callback();
        } catch (error) {
            this.emit('error', error);
            callback();
        }
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
function getEmojiForLevel(level: string): string {
    const emojiMap: Record<string, string> = {
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
export const botLogger: BotLogger = {
    // Connection related
    connection: (message: string, meta: LogMetadata = {}) => logger.info(`🔗 ${message}`, meta),
    qr: (message: string, meta: LogMetadata = {}) => logger.info(`📱 ${message}`, meta),

    // Message related
    messageReceived: (message: string, meta: LogMetadata = {}) => logger.info(`📥 ${message}`, meta),
    messageSent: (message: string, meta: LogMetadata = {}) => logger.info(`📤 ${message}`, meta),

    // Media related
    mediaProcessing: (message: string, meta: LogMetadata = {}) => logger.info(`🖼️ ${message}`, meta),
    viewOnceDetected: (message: string, meta: LogMetadata = {}) => logger.info(`🕵️ ${message}`, meta),
    mediaSaved: (message: string, meta: LogMetadata = {}) => logger.info(`💾 ${message}`, meta),

    // File operations
    fileOperation: (message: string, meta: LogMetadata = {}) => logger.info(`📁 ${message}`, meta),

    // Database operations
    database: (message: string, meta: LogMetadata = {}) => logger.info(`🗄️ ${message}`, meta),

    // Error related
    error: (message: string, meta: LogMetadata = {}) => logger.error(`❌ ${message}`, meta),
    warning: (message: string, meta: LogMetadata = {}) => logger.warn(`⚠️ ${message}`, meta),

    // Success operations
    success: (message: string, meta: LogMetadata = {}) => logger.info(`✅ ${message}`, meta),

    // General info
    info: (message: string, meta: LogMetadata = {}) => logger.info(`ℹ️ ${message}`, meta),
    debug: (message: string, meta: LogMetadata = {}) => logger.debug(`🐛 ${message}`, meta),

    // Bot lifecycle
    startup: (message: string, meta: LogMetadata = {}) => logger.info(`🚀 ${message}`, meta),
    shutdown: (message: string, meta: LogMetadata = {}) => logger.info(`🛑 ${message}`, meta),

    // Processing status
    processing: (message: string, meta: LogMetadata = {}) => logger.info(`⚙️ ${message}`, meta),
    completed: (message: string, meta: LogMetadata = {}) => logger.info(`✨ ${message}`, meta),

    // Room-specific logging methods
    roomMessage: (roomId: string, message: string, meta: LogMetadata = {}) => logger.info(`💬 ${message}`, { ...meta, roomId }),
    roomActivity: (roomId: string, message: string, meta: LogMetadata = {}) => logger.info(`🔄 ${message}`, { ...meta, roomId }),
    roomError: (roomId: string, message: string, meta: LogMetadata = {}) => logger.error(`❌ ${message}`, { ...meta, roomId }),
    roomWarning: (roomId: string, message: string, meta: LogMetadata = {}) => logger.warn(`⚠️ ${message}`, { ...meta, roomId }),
    roomInfo: (roomId: string, message: string, meta: LogMetadata = {}) => logger.info(`ℹ️ ${message}`, { ...meta, roomId })
};

export default logger;
