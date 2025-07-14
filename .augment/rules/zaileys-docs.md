---
type: "always_apply"
---

Below is the full docs and source code of Zaileys, the Whatsapp bot framework used for building our bot. Use it as the main reference

```
This project is a Whatsapp Bot built using the Zaileys framework, which is a high-level abstraction layer on top of the Baileys WebSocket API. It simplifies WhatsApp bot development by providing a structured, event-driven framework with built-in session persistence and data management.
Below is the technical documentation for Zaileys, detailing its core architecture, client initialization, event handling, action API, and LLM & database adapters.

# **Zaileys: A Comprehensive Technical Documentation**

## **1\. Core Architecture**

Zaileys operates as a high-level abstraction layer on top of the **Baileys WebSocket API**. It is designed to simplify WhatsApp bot development by providing a structured, event-driven framework with built-in session persistence and data management.  
The architecture is composed of three primary classes:

1. **Client (src/classes/Client.ts)**: The main entry point and orchestrator. It handles initialization, configuration, connection management, and event emission. It acts as a proxy, exposing the methods of the Worker class directly.  
2. **Parser (src/classes/Parser.ts)**: The data transformation engine. It listens for raw events from Baileys (connection.update, messages.upsert, call, etc.) and parses them into structured, type-safe objects defined by Zod schemas.  
3. **Worker (src/classes/Worker.ts)**: The action executor. It contains all the methods for performing actions on WhatsApp, such as sending messages, fetching profiles, and updating presence. These methods are exposed through the Client instance.

Underpinning these classes is a **database layer** powered by **Kysely**, a type-safe SQL query builder. This layer is responsible for persisting all critical data, including authentication credentials, chat history, contacts, and AI-related data, ensuring session continuity and data integrity.  
---

## **2\. Client Initialization and Configuration**

The Client class is instantiated with a single configuration object. The validation and default values are handled by the ClientClassesType Zod schema from src/types/classes/client.ts.

### **Initialization Sequence**

1. **Configuration Parsing**: The provided props are parsed and validated against the ClientClassesType Zod schema.  
2. **Database Connection**: A Kysely instance is created via ConnectDB based on the database options.  
3. **Database Migration**: MigrateDB is executed to ensure all necessary tables (auth, chats, messages, etc.) exist.  
4. **Authentication Adapter**: AuthAdapterHandler is initialized. It provides the state (creds and keys) and saveCreds methods to Baileys, using the auth table for persistence.  
5. **Store Adapter**: StoreAdapterHandler is initialized. Its bind method subscribes to Baileys events to store message, chat, and contact data in the database.  
6. **WebSocket Initialization**: makeWASocket from Baileys is called with the necessary handlers and configuration.  
7. **Worker Instantiation**: The Worker class is instantiated with the client, database, and socket instances.  
8. **Webhooks Server**: If configured, the startWebhooks function initializes an Hono server to listen for incoming webhook requests.

### **Configuration Options**

| Parameter | Schema Type | Default | Description |
| :---- | :---- | :---- | :---- |
| authType | z.literal("qr") | "qr" | The authentication method. Currently, only 'qr' is recommended. |
| prefix | z.string().optional() | \- | A string that, if present at the start of a message, sets ctx.isPrefix to true. |
| ignoreMe | z.boolean() | true | If true, the messages event will not be emitted for outgoing messages. |
| showLogs | z.boolean() | true | Toggles the visibility of initialization spinners and logs. |
| autoMentions | z.boolean() | true | Automatically extracts all JIDs mentioned in text and includes them in the message options. |
| autoOnline | z.boolean() | true | Corresponds to Baileys' markOnlineOnConnect. Sets an online presence upon connection. |
| autoRead | z.boolean() | true | Automatically calls socket.readMessages for every incoming message. |
| autoPresence | z.boolean() | true | Automatically sends a 'composing' or 'recording' presence update before sending a message. |
| autoRejectCall | z.boolean() | true | If true, socket.rejectCall is automatically called for any incoming call event. |
| loadLLMSchemas | z.boolean() | false | **Crucial for AI.** If true, MigrateDB will create the llm\_messages, llm\_personalization, and llm\_rag tables. The client.llms adapter will be functional. |
| database | AdapterDatabaseType | { type: "sqlite", ... } | Configures the database connection. type can be sqlite, postgresql, or mysql. connection.url holds the database path or connection string. |
| limiter | LimiterType | \- | Configures the rate limiter. Requires durationMs (number) and maxMessages (number). Sets ctx.isSpam. |
| webhooks | WebhooksType | \- | Configures webhooks. url is an endpoint to which Zaileys will POST event data. A local webhook server is also started. |
| citation | CitationType | \- | An object where keys are custom group names and values are functions returning an array of numeric WhatsApp IDs. This populates ctx.citation with boolean flags (e.g., isAdmins). |

---

## **3\. Event Handling and Data Parsing**

The Parser class is central to Zaileys' operation. It consumes raw Baileys events and emits structured, useful data via the Client's event emitter.

### **Event: connection**

* **Trigger**: socket.ev.on('connection.update')  
* **Context (ctx)**: { status: 'connecting' | 'open' | 'close' }  
* **Logic**: Manages console spinners, logs QR codes to the terminal, and handles reconnection logic for specific disconnect reasons (e.g., restartRequired).

### **Event: messages**

* **Trigger**: socket.ev.on('messages.upsert')  
* **Context (ctx)**: MessagesParserType (src/types/parser/messages.ts)  
* **Parsing Logic (parser.messages)**:  
  1. **Initial Filter**: Ignores irrelevant messages like protocol messages or stub messages.  
  2. **Special Message Handling**:  
     * **Pinned/Unpinned**: The pinInChatMessage contains the key of the original message. The parser fetches this original message from the messages database table and continues parsing it.  
     * **Deleted**: The protocolMessage contains the key of the deleted message. The parser fetches this from the database to provide its context.  
  3. **Payload Population (MessagesParserType)**:  
     * chatId: message.key.id  
     * roomId: message.key.remoteJid  
     * senderId: message.participant (for groups) or message.key.remoteJid (for private chats).  
     * roomName, senderName: Resolved by looking up the corresponding JID in the chats database table. Falls back to pushName.  
     * chatType: The getContentType result is mapped via MessagesMediaType to a simplified type (e.g., imageMessage \-\> image).  
     * text: Extracted from message.conversation, media.caption, media.text, etc., and normalized using normalizeText.  
     * **Boolean Flags**:  
       * isGroup: roomId.includes('@g.us')  
       * isStory: roomId.includes('@broadcast')  
       * isEdited: Checks for the presence of "editedMessage" in the stringified message object.  
       * isForwarded: Checks for "forwardingScore" in the context info.  
     * media: A media object containing all properties from the raw message *except* internal keys like mediaKey or fileSha256. It includes two functions:  
       * buffer(): Asynchronously calls downloadMediaMessage(message, 'buffer', {}).  
       * stream(): Asynchronously calls downloadMediaMessage(message, 'stream', {}).  
     * replied: If the message is a reply, the parser recursively calls itself (this.messages) with the context of the quoted message to provide a fully parsed replied object.  
     * message: A function that returns the original, unmodified proto.IWebMessageInfo object from Baileys.

### **Event: calls**

* **Trigger**: socket.ev.on('call')  
* **Context (ctx)**: CallsParserBaseType (src/types/parser/calls.ts)  
* **Logic**: Parses the WACallEvent array, populating the schema with details like callId, callerId, status, isVideo, etc.

### **Event: webhooks**

* **Trigger**: An HTTP GET or POST request to the local webhook server on port 4135\.  
* \*\*Context (ctx)\*\*: WebhooksParserBaseType (src/types/parser/webhooks.ts\`)  
* **Logic**: The Hono request context is parsed to extract query parameters, json body, form data, and the raw body into ctx.data.

---

## **4\. Action API (The Worker Class)**

The Worker class methods constitute the API for sending data and performing actions.

### **Core Sending Method: sendMessage (private)**

This is the foundation for almost all outgoing messages.

* **Functionality**:  
  1. Applies autoPresence updates ('composing' or 'recording').  
  2. If autoMentions is true, extracts JIDs from the content to populate mentionedJid.  
  3. Handles asForwarded and asAI flags. The asAI flag adds a specific binary node to the message relay, which marks it as being from a business bot.  
  4. Handles quoted messages, including verifiedReply which substitutes the remoteJid with a verified business JID.  
  5. Calls Baileys' generateWAMessage to create the message object.  
  6. Calls socket.relayMessage to send it over the WebSocket.  
  7. Returns a fully parsed message object by calling parser.messages on the generated message.

### **Public Methods**

| Method | Input Schema | Options Schema | Description |
| :---- | :---- | :---- | :---- |
| **text** | TextWorkerBaseType | TextWorkerOptionsType | Sends text or media. Input can be a string or an object like { image: bufferOrUrl, text: 'caption' }, { video: ... }, { audio: ... }, { voice: ... }, { sticker: ... }. |
| **location** | LocationWorkerBaseType | LocationWorkerOptionsType | Sends a location pin with latitude and longitude. |
| **contact** | ContactWorkerBaseType | ContactWorkerOptionsType | Constructs and sends a VCF (vCard) contact. |
| **reaction** | ReactionWorkerBaseType | ReactionWorkerOptionsType | Sends a reaction emoji to a specific message. |
| **pin** | PinWorkerBaseType | PinWorkerOptionsType | Pins or unpins a message in a chat for a specified duration ('24h', '7d', '30d'). |
| **poll** | PollWorkerBaseType | PollWorkerOptionsType | Creates and sends a poll. |
| **edit** | EditWorkerBaseType | EditWorkerOptionsType | Edits a previously sent message. |
| **delete** | DeleteWorkerBaseType | \- | Deletes a message for everyone. |
| **rejectCall** | RejectCallWorkerBaseType | \- | Rejects an incoming call. |
| **mute** | MuteWorkerBaseType | MuteWorkerOptionsType | Mutes a chat for a specified duration ('8h', '7d', 'remove'). |
| **profile** | ProfileWorkerBaseType | \- | Fetches profile information. For groups, it returns metadata including members. For users, it returns name, bio (fetchStatus), and avatar URL. |
| **presence** | PresenceWorkerBaseType | PresenceWorkerOptionsType | Manually sets the bot's presence in a chat ('typing', 'recording', 'online', 'offline', 'paused'). |

---

## **5\. LLM & Database Adapters**

When loadLLMSchemas is true, the client.llms and client.chats adapters become available.

### **llms Adapter (llmsAdapter)**

This adapter provides a structured interface to the llm\_\* database tables for building AI applications.

* **Completions (Conversation History)**:  
  * addCompletion(props: llmMessagesTable): Inserts a user or assistant message into llm\_messages.  
  * getCompletions(channelId: string): Retrieves all messages for a given channelId, ordered chronologically.  
  * clearCompletions(channelId: string): Deletes the history for a channel.  
* **Personalization (User Instructions)**:  
  * addPersonalization(props: llmPersonalizationTable): Inserts a user-specific instruction into llm\_personalization.  
  * getPersonalization(senderId: string): Retrieves all stored instructions for a user.  
* **RAG (Retrieval-Augmented Generation)**:  
  * addRAG(props: addRAGType): Inserts a document (pageContent) into the llm\_rag table.  
  * getRAGs(keyword: string): Searches for relevant documents.  
    1. Splits the search keyword into terms.  
    2. Fetches all documents from the llm\_rag table (with caching).  
    3. Filters documents where any word in the pageContent has a small Levenshtein distance to any of the search terms. This provides a fuzzy search capability.  
  * clearRAGs(): Wipes the entire RAG database.
```

### **chats Adapter (chatsAdapter)**

* **getMessage(chatId: string)**: Retrieves a single message by its ID from the messages table and returns it as a fully parsed MessagesParserType object.