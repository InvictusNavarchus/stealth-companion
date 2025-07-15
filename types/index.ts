/**
 * TypeScript type definitions for Stealth Companion WhatsApp Bot
 * Comprehensive type definitions for all interfaces and data structures
 */

import winston from 'winston';

// ============================================================================
// ZAILEYS CLIENT TYPES
// ============================================================================

export interface ZaileysClient {
  on(event: "messages", callback: (ctx: MessageContext) => Promise<void>): void;
  on(event: "connection", callback: (ctx: ConnectionContext) => Promise<void>): void;
  // Add other client methods as needed
}

// ============================================================================
// MESSAGE CONTEXT TYPES
// ============================================================================

export interface MediaInfo {
  mimetype: string;
  caption?: string;
  height?: number;
  width?: number;
  fileLength?: number;
  duration?: number; // For audio/video
  pages?: number; // For documents
  fileName?: string; // For documents
  viewOnce?: boolean;
  buffer?(): Promise<Buffer>; // For downloading media as buffer
  stream?(): Promise<NodeJS.ReadableStream>; // For downloading media as stream
}

export interface MessageContext {
  chatId: string;
  channelId?: string;
  uniqueId?: string;
  roomId: string;
  roomName: string;
  senderId: string;
  senderName: string;
  senderDevice?: string;
  isGroup: boolean;
  isStory: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  isViewOnce?: boolean;
  isFromMe?: boolean;
  chatType: ChatType;
  text?: string;
  timestamp: number;
  media?: MediaInfo;
  replied?: MessageContext;
}

export type ChatType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'voice' 
  | 'document' 
  | 'sticker' 
  | 'location' 
  | 'contact' 
  | 'viewOnce'
  | 'story';

// ============================================================================
// CONNECTION CONTEXT TYPES
// ============================================================================

export interface ConnectionContext {
  status: ConnectionStatus;
  qr?: string;
  error?: Error;
}

export type ConnectionStatus = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'qr' 
  | 'error';

// ============================================================================
// STORED MESSAGE TYPES
// ============================================================================

export interface BaseStoredMessage {
  chatId: string;
  channelId?: string;
  uniqueId?: string;
  roomId: string;
  roomName: string;
  senderId: string;
  senderName: string;
  senderDevice?: string;
  timestamp: number | string;
  text?: string;
  isFromMe?: boolean;
  isGroup: boolean;
  chatType: ChatType;
  processedAt?: string;
}

export interface StoredMessage extends BaseStoredMessage {
  id: string;
  originalMessage: {
    chatId: string;
    roomId: string;
    roomName: string;
    senderId: string;
    senderName: string;
    isGroup: boolean;
    timestamp: number;
    chatType: ChatType;
    text?: string;
  };
  viewOnceData: ViewOnceData;
  replyContext: ReplyContext;
}

export interface ViewOnceData {
  viewOnceImagePath: string;
  viewOnceMediaType: MediaType;
  originalMimetype: string;
  originalCaption?: string;
  mediaMetadata: MediaMetadata;
}

export interface ReplyContext {
  roomId: string;
  roomName: string;
  senderId: string;
  senderName: string;
  isGroup: boolean;
}

export interface MediaMetadata {
  height?: number;
  width?: number;
  fileLength?: number;
  duration?: number;
  pages?: number;
  fileName?: string;
}

export type MediaType = 'image' | 'video' | 'audio';

// ============================================================================
// MEDIA STORAGE TYPES
// ============================================================================

export interface MediaMessage {
  id: string;
  timestamp: number;
  originalMessage: {
    chatId: string;
    roomId: string;
    roomName: string;
    senderId: string;
    senderName: string;
    isGroup: boolean;
    timestamp: number;
    chatType: ChatType;
    text?: string;
  };
  media: MediaInfo;
  processedAt: string;
  contentType: string;
  roomContext: RoomContext;
  filePath: string;
}

export interface RoomContext {
  roomId: string;
  roomName: string;
  isGroup: boolean;
  senderName: string;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface ReconnectConfig {
  maxRetries: number;
  retryDelay: number;
  connectionTimeout: number;
  currentRetries: number;
}

export interface DatabaseConfig {
  type: string;
  connection: {
    url: string;
  };
}

export interface ClientConfig {
  authType: "qr" | "pairing";
  prefix?: string;
  ignoreMe?: boolean;
  showLogs?: boolean;
  autoRead?: boolean;
  autoOnline?: boolean;
  autoPresence?: boolean;
  autoRejectCall?: boolean;
  loadLLMSchemas?: boolean;
  database?: DatabaseConfig;
  phoneNumber?: number; // Required when authType is "pairing"
}

export interface ImageStorageConfig {
  enableRegularImages: boolean;
  maxFileSize: number;
  minFileSize: number;
  supportedFormats: string[];
  filters: {
    skipRooms: string[];
    onlyRooms: string[];
    skipSenders: string[];
    skipGroups: boolean;
    skipPrivateChats: boolean;
  };
  storage: {
    organizeByRoom: boolean;
  };
  processing: {
    storeCaptions: boolean;
    storeDimensions: boolean;
    storeSenderInfo: boolean;
  };
}

// ============================================================================
// LOGGER TYPES
// ============================================================================

export interface LogMetadata {
  [key: string]: unknown;
  roomId?: string;
}

export interface BotLogger {
  connection: (message: string, meta?: LogMetadata) => void;
  qr: (message: string, meta?: LogMetadata) => void;
  messageReceived: (message: string, meta?: LogMetadata) => void;
  messageSent: (message: string, meta?: LogMetadata) => void;
  mediaProcessing: (message: string, meta?: LogMetadata) => void;
  viewOnceDetected: (message: string, meta?: LogMetadata) => void;
  mediaSaved: (message: string, meta?: LogMetadata) => void;
  fileOperation: (message: string, meta?: LogMetadata) => void;
  database: (message: string, meta?: LogMetadata) => void;
  error: (message: string, meta?: LogMetadata) => void;
  warning: (message: string, meta?: LogMetadata) => void;
  success: (message: string, meta?: LogMetadata) => void;
  info: (message: string, meta?: LogMetadata) => void;
  debug: (message: string, meta?: LogMetadata) => void;
  startup: (message: string, meta?: LogMetadata) => void;
  shutdown: (message: string, meta?: LogMetadata) => void;
  processing: (message: string, meta?: LogMetadata) => void;
  completed: (message: string, meta?: LogMetadata) => void;
  roomMessage: (roomId: string, message: string, meta?: LogMetadata) => void;
  roomActivity: (roomId: string, message: string, meta?: LogMetadata) => void;
  roomError: (roomId: string, message: string, meta?: LogMetadata) => void;
  roomWarning: (roomId: string, message: string, meta?: LogMetadata) => void;
  roomInfo: (roomId: string, message: string, meta?: LogMetadata) => void;
}

// ============================================================================
// WINSTON TRANSPORT TYPES
// ============================================================================

export interface RoomTransportOptions {
  dirname?: string;
  format?: winston.Logform.Format;
}

export interface LogInfo {
  level: string;
  message: string;
  roomId?: string;
  [key: string]: unknown;
}

// ============================================================================
// MEDIA MANAGER TYPES
// ============================================================================

export interface StorageStatistics {
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
    timestamp: string;
    roomName: string;
    senderName: string;
    mediaType: string;
    hasMedia: boolean;
  }>;
}

export interface DirectoryAnalysis {
  overview: {
    totalSize: number;
    totalFiles: number;
    formattedSize: string;
  };
  directories: Record<string, DirectoryInfo>;
}

export interface DirectoryInfo {
  fileCount: number;
  totalSize: number;
  formattedSize: string;
  error?: string;
}

export interface CleanupResults {
  scanned: number;
  toDelete: number;
  deletedFiles: string[];
  errors: Array<{ file?: string; directory?: string; error: string }>;
  estimatedSpaceSaved: number;
  dryRun: boolean;
  cutoffDate: string;
  formattedSpaceSaved: string;
}

export interface DuplicateFile {
  hash: string;
  files: string[];
  size: number;
}

// ============================================================================
// EXTENDED STORED MESSAGE TYPES
// ============================================================================

export interface StoredMediaMessage extends BaseStoredMessage {
  hasMedia: true;
  mediaPath: string;
  mediaType: ChatType;
  media: MediaInfo;
  contentType: string;
  roomContext: RoomContext;
}

export interface StoredViewOnceMessage extends BaseStoredMessage {
  viewOnceMediaPath: string;
  viewOnceMediaType: MediaType;
  viewOnceMessage: BaseStoredMessage & {
    media: MediaInfo;
  };
  replyContext: ReplyContext;
}

export interface StoredStoryMessage extends BaseStoredMessage {
  storyMediaPath: string | null;
  mediaType: ChatType;
  storyData: {
    isStory: boolean;
    originalChatType: ChatType;
    mediaDownloaded: boolean;
  };
}

export type AnyStoredMessage = StoredMessage | StoredMediaMessage | StoredViewOnceMessage | StoredStoryMessage;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SupportedMediaType = Extract<ChatType, 'image' | 'video' | 'document' | 'audio' | 'voice' | 'sticker'>;

export interface FileExtensionMap {
  [key: string]: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface BotError extends Error {
  code?: string;
  context?: Record<string, unknown>;
}
