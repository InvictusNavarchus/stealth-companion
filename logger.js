import winston from 'winston';

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
        // File transport for all logs
        new winston.transports.File({
            filename: './logs/combined.log',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
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
    completed: (message, meta = {}) => logger.info(`✨ ${message}`, meta)
};

export default logger;
