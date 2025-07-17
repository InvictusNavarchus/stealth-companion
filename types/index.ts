/**
 * TypeScript type definitions for Stealth Companion WhatsApp Bot
 * Comprehensive type definitions for all interfaces and data structures
 * Updated to match the accurate Zaileys library context schema
 */

import winston from 'winston';
import { Readable } from 'stream';

// ============================================================================
// ZAILEYS CLIENT TYPES
// ============================================================================

export interface ZaileysClient {
  on(event: "messages", callback: (ctx: MessageContext) => Promise<void>): void;
  on(event: "connection", callback: (ctx: ConnectionContext) => Promise<void>): void;
  // Add other client methods as needed
}

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Device type of the message sender
 */
export type SenderDevice = "unknown" | "android" | "ios" | "desktop" | "web";

/**
 * Complete ChatType enum matching Zaileys library schema
 */
export type ChatType =
  // Text Messages
  | 'text'

  // Media Messages
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'ptv'

  // Interactive Messages
  | 'contact'
  | 'location'
  | 'liveLocation'
  | 'list'
  | 'listResponse'
  | 'buttons'
  | 'buttonsResponse'
  | 'interactive'
  | 'interactiveResponse'
  | 'template'
  | 'templateButtonReply'

  // Poll Messages
  | 'pollCreation'
  | 'pollUpdate'

  // Special Messages
  | 'reaction'
  | 'viewOnce'
  | 'ephemeral'
  | 'protocol'
  | 'groupInvite'
  | 'product'
  | 'order'
  | 'invoice'
  | 'event'
  | 'comment'
  | 'callLog'

  // System Messages
  | 'deviceSent'
  | 'contactsArray'
  | 'highlyStructured'
  | 'sendPayment'
  | 'requestPayment'
  | 'declinePaymentRequest'
  | 'cancelPaymentRequest'
  | 'paymentInvite'
  | 'keepInChat'
  | 'requestPhoneNumber'
  | 'groupMentioned'
  | 'pinInChat'
  | 'scheduledCallCreation'
  | 'scheduledCallEdit'
  | 'botInvoke'
  | 'encComment'
  | 'bcall'
  | 'lottieSticker'
  | 'placeholder'
  | 'encEventUpdate';

// ============================================================================
// MESSAGE CONTEXT TYPES
// ============================================================================

/**
 * Citation object containing dynamic boolean flags based on client configuration
 */
export type Citation = Record<string, boolean> | null;

/**
 * Enhanced MediaInfo interface matching Zaileys library schema
 */
export interface MediaInfo {
  // Media metadata (varies by type)
  mimetype?: string;
  fileSha256?: Buffer;
  fileLength?: number;
  seconds?: number; // for audio/video
  width?: number; // for images/videos
  height?: number; // for images/videos
  caption?: string;
  // ... other media-specific properties can be added as needed

  // Methods to access media content
  buffer(): Promise<Buffer>;
  stream(): Promise<Readable>;
}

/**
 * Complete MessageContext interface matching Zaileys library schema
 */
export interface MessageContext {
  // Core Identifiers
  chatId: string;
  channelId: string;
  uniqueId: string;

  // Participant Information
  receiverId: string;
  receiverName: string;
  roomId: string;
  roomName: string;
  senderId: string;
  senderName: string;
  senderDevice: SenderDevice;

  // Message Content
  chatType: ChatType;
  timestamp: number;
  text: string | null;
  mentions: string[];
  links: string[];

  // Boolean Flags
  isPrefix: boolean;
  isSpam: boolean;
  isFromMe: boolean;
  isTagMe: boolean;
  isGroup: boolean;
  isStory: boolean;
  isViewOnce: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  isUnPinned: boolean;
  isChannel: boolean;
  isBroadcast: boolean;
  isEphemeral: boolean;
  isForwarded: boolean;

  // Special Objects
  citation: Citation;
  media: MediaInfo | null;
  replied: MessageContext | null;

  // Message Function
  message(): any; // proto.IWebMessageInfo - will be properly typed when Baileys types are imported
}

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
  | 'open'      // Zaileys uses 'open' for successful connections
  | 'close'     // Zaileys uses 'close' for disconnections
  | 'qr'
  | 'error';

// ============================================================================
// STORED MESSAGE TYPES
// ============================================================================

/**
 * Base interface for stored messages, updated to match new MessageContext schema
 */
export interface BaseStoredMessage {
  chatId: string;
  channelId: string;
  uniqueId: string;
  roomId: string;
  roomName: string;
  senderId: string;
  senderName: string;
  senderDevice: SenderDevice;
  timestamp: number | string;
  text: string | null;
  isFromMe: boolean;
  isGroup: boolean;
  chatType: ChatType;
  processedAt?: string;

  // Additional fields that may be useful for stored messages
  receiverId?: string;
  receiverName?: string;
  mentions?: string[];
  links?: string[];
  isPrefix?: boolean;
  isSpam?: boolean;
  isTagMe?: boolean;
  isStory?: boolean;
  isViewOnce?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  isUnPinned?: boolean;
  isChannel?: boolean;
  isBroadcast?: boolean;
  isEphemeral?: boolean;
  isForwarded?: boolean;
}

export interface StoredMessage extends BaseStoredMessage {
  id: string;
  originalMessage: {
    chatId: string;
    channelId: string;
    uniqueId: string;
    roomId: string;
    roomName: string;
    senderId: string;
    senderName: string;
    senderDevice: SenderDevice;
    isGroup: boolean;
    timestamp: number;
    chatType: ChatType;
    text: string | null;
    receiverId?: string;
    receiverName?: string;
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
  senderDevice: SenderDevice;
  isGroup: boolean;
}

export interface MediaMetadata {
  height?: number;
  width?: number;
  fileLength?: number;
  duration?: number; // renamed from seconds for consistency
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
    channelId: string;
    uniqueId: string;
    roomId: string;
    roomName: string;
    senderId: string;
    senderName: string;
    senderDevice: SenderDevice;
    isGroup: boolean;
    timestamp: number;
    chatType: ChatType;
    text: string | null;
    receiverId?: string;
    receiverName?: string;
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
  senderDevice: SenderDevice;
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
  type: "sqlite" | "postgresql" | "mysql";
  connection: {
    url: string;
  };
}

export type ClientConfig =
  | {
      authType: "qr";
      prefix?: string;
      ignoreMe?: boolean;
      showLogs?: boolean;
      autoRead?: boolean;
      autoOnline?: boolean;
      autoPresence?: boolean;
      autoRejectCall?: boolean;
      loadLLMSchemas?: boolean;
      database?: DatabaseConfig;
      phoneNumber?: undefined;
    }
  | {
      authType: "pairing";
      phoneNumber: number;
      prefix?: string;
      ignoreMe?: boolean;
      showLogs?: boolean;
      autoRead?: boolean;
      autoOnline?: boolean;
      autoPresence?: boolean;
      autoRejectCall?: boolean;
      loadLLMSchemas?: boolean;
      database?: DatabaseConfig;
    };

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

export type SupportedMediaType = Extract<ChatType, 'image' | 'video' | 'document' | 'audio' | 'sticker' | 'ptv'>;

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
