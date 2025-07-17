---
type: "manual"
---

# Zaileys Context Object (ctx) Schema

This document provides a comprehensive schema for the `ctx` object that is sent to users when a message arrives in the Zaileys WhatsApp library.

## Overview

The `ctx` object is passed to the `messages` event handler and contains all information about the received message, sender, receiver, and various metadata flags.

```typescript
wa.on("messages", (ctx) => {
  // ctx contains all message information
  console.log(ctx);
});
```

## Complete Schema

### Core Identifiers

| Property | Type | Description |
|----------|------|-------------|
| `chatId` | `string` | Unique identifier for the specific message |
| `channelId` | `string` | Combined identifier: `roomId-senderId` (without @domain) |
| `uniqueId` | `string` | Unique identifier: `channelId-chatId` |

### Participant Information

| Property | Type | Description |
|----------|------|-------------|
| `receiverId` | `string` | WhatsApp ID of the bot/receiver (normalized) |
| `receiverName` | `string` | Display name of the bot/receiver |
| `roomId` | `string` | WhatsApp ID of the chat room (normalized) |
| `roomName` | `string` | Display name of the chat room |
| `senderId` | `string` | WhatsApp ID of the message sender (normalized) |
| `senderName` | `string` | Display name of the message sender |
| `senderDevice` | `"unknown" \| "android" \| "ios" \| "desktop" \| "web"` | Device type of the sender |

### Message Content

| Property | Type | Description |
|----------|------|-------------|
| `chatType` | `MessageType` | Type of message content (see Message Types below) |
| `timestamp` | `number` | Unix timestamp of the message |
| `text` | `string \| null` | Text content of the message (extracted from various message types) |
| `mentions` | `string[]` | Array of mentioned user IDs (without @domain) |
| `links` | `string[]` | Array of URLs found in the message text |

### Boolean Flags

| Property | Type | Description |
|----------|------|-------------|
| `isPrefix` | `boolean` | Whether message starts with configured prefix |
| `isSpam` | `boolean` | Whether message is detected as spam (rate limited) |
| `isFromMe` | `boolean` | Whether message was sent by the bot itself |
| `isTagMe` | `boolean` | Whether the bot is mentioned in the message |
| `isGroup` | `boolean` | Whether message is from a group chat (`@g.us`) |
| `isStory` | `boolean` | Whether message is from status/story (`@broadcast`) |
| `isViewOnce` | `boolean` | Whether message is a view-once message |
| `isEdited` | `boolean` | Whether message has been edited |
| `isDeleted` | `boolean` | Whether message has been deleted |
| `isPinned` | `boolean` | Whether message has been pinned |
| `isUnPinned` | `boolean` | Whether message has been unpinned |
| `isChannel` | `boolean` | Whether message is from a channel (`@newsletter`) |
| `isBroadcast` | `boolean` | Whether message is a broadcast message |
| `isEphemeral` | `boolean` | Whether message is ephemeral (disappearing) |
| `isForwarded` | `boolean` | Whether message has been forwarded |

### Special Objects

#### Citation Object
```typescript
citation: Record<string, boolean> | null
```

Dynamic object containing custom boolean flags based on client configuration. Keys are transformed from citation config:
- `admins: () => [...]` becomes `citation.isAdmins`
- `vips: () => [...]` becomes `citation.isVips`
- `premiumUsers: () => [...]` becomes `citation.isPremiumUsers`

Example:
```typescript
const wa = new Client({
  citation: {
    admins: () => [628123456789],
    vips: () => [628123456789],
  },
});

// In message handler:
if (ctx.citation?.isAdmins) {
  // Handle admin user
}
```

#### Media Object
```typescript
media: {
  // Media metadata (varies by type)
  mimetype?: string;
  fileSha256?: Buffer;
  fileLength?: number;
  seconds?: number; // for audio/video
  width?: number; // for images/videos
  height?: number; // for images/videos
  caption?: string;
  // ... other media-specific properties
  
  // Methods to access media content
  buffer: () => Promise<Buffer>;
  stream: () => Promise<Readable>;
} | null
```

Available when `chatType` is not "text". Contains media metadata and methods to download content.

#### Replied Object
```typescript
replied: ContextObject | null
```

When the message is a reply, contains the complete context object of the replied message (same schema as main ctx).

#### Message Function
```typescript
message: () => proto.IWebMessageInfo
```

Function that returns the original raw WhatsApp message object from Baileys.

## Message Types

The `chatType` property can be one of the following values:

### Text Messages
- `"text"` - Plain text, conversation, edited messages, newsletter admin invites, extended text

### Media Messages
- `"image"` - Image messages
- `"video"` - Video messages  
- `"audio"` - Audio messages
- `"document"` - Document messages
- `"sticker"` - Sticker messages
- `"ptv"` - Picture-in-picture video messages

### Interactive Messages
- `"contact"` - Contact card messages
- `"location"` - Location messages
- `"liveLocation"` - Live location messages
- `"list"` - List messages
- `"listResponse"` - List response messages
- `"buttons"` - Button messages
- `"buttonsResponse"` - Button response messages
- `"interactive"` - Interactive messages
- `"interactiveResponse"` - Interactive response messages
- `"template"` - Template messages
- `"templateButtonReply"` - Template button reply messages

### Poll Messages
- `"pollCreation"` - Poll creation messages
- `"pollUpdate"` - Poll update messages

### Special Messages
- `"reaction"` - Reaction messages
- `"viewOnce"` - View once messages
- `"ephemeral"` - Ephemeral messages
- `"protocol"` - Protocol messages
- `"groupInvite"` - Group invite messages
- `"product"` - Product messages
- `"order"` - Order messages
- `"invoice"` - Invoice messages
- `"event"` - Event messages
- `"comment"` - Comment messages
- `"callLog"` - Call log messages

### System Messages
- `"deviceSent"` - Device sent messages
- `"contactsArray"` - Contacts array messages
- `"highlyStructured"` - Highly structured messages
- `"sendPayment"` - Send payment messages
- `"requestPayment"` - Request payment messages
- `"declinePaymentRequest"` - Decline payment request messages
- `"cancelPaymentRequest"` - Cancel payment request messages
- `"paymentInvite"` - Payment invite messages
- `"keepInChat"` - Keep in chat messages
- `"requestPhoneNumber"` - Request phone number messages
- `"groupMentioned"` - Group mentioned messages
- `"pinInChat"` - Pin in chat messages
- `"scheduledCallCreation"` - Scheduled call creation messages
- `"scheduledCallEdit"` - Scheduled call edit messages
- `"botInvoke"` - Bot invoke messages
- `"encComment"` - Encrypted comment messages
- `"bcall"` - Business call messages
- `"lottieSticker"` - Lottie sticker messages
- `"placeholder"` - Placeholder messages
- `"encEventUpdate"` - Encrypted event update messages

## Usage Examples

### Basic Message Handling
```typescript
wa.on("messages", (ctx) => {
  if (ctx.text === "hello") {
    wa.text("Hello back!", { roomId: ctx.roomId });
  }
});
```

### Handling Media Messages
```typescript
wa.on("messages", async (ctx) => {
  if (ctx.chatType === "image") {
    const buffer = await ctx.media?.buffer();
    // Process image buffer
  }
});
```

### Using Citation System
```typescript
wa.on("messages", (ctx) => {
  if (ctx.citation?.isAdmins) {
    wa.text("Admin command executed", { roomId: ctx.roomId });
  }
});
```

### Handling Replies
```typescript
wa.on("messages", (ctx) => {
  if (ctx.replied) {
    wa.text(`You replied to: ${ctx.replied.text}`, { roomId: ctx.roomId });
  }
});
```

### Group vs Private Chat
```typescript
wa.on("messages", (ctx) => {
  if (ctx.isGroup) {
    // Handle group message
    if (ctx.isTagMe) {
      wa.text("You mentioned me!", { roomId: ctx.roomId });
    }
  } else {
    // Handle private message
    wa.text("Private message received", { roomId: ctx.roomId });
  }
});
```

## TypeScript Type Definition

```typescript
import { z } from "zod";
import { MessagesParserType } from "zaileys";

type MessageContext = z.infer<typeof MessagesParserType>;
```

This schema represents the complete structure of the context object passed to message event handlers in the Zaileys WhatsApp library.
