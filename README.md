# Stealth Companion WhatsApp Bot

A stealthy WhatsApp bot built with the Zaileys framework for monitoring and archiving messages, stories, and view-once media.

## 🚀 Quick Setup

### 1. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit the `.env` file with your preferred settings:

```env
# WhatsApp Bot Configuration

# Reconnection settings
RECONNECT_MAX_RETRIES=10
RECONNECT_RETRY_DELAY=30000

# WhatsApp client settings
CLIENT_AUTH_TYPE=qr
CLIENT_PREFIX=/
CLIENT_IGNORE_ME=false
CLIENT_SHOW_LOGS=true
CLIENT_AUTO_READ=true
CLIENT_AUTO_ONLINE=true
CLIENT_AUTO_PRESENCE=true
CLIENT_AUTO_REJECT_CALL=true
CLIENT_LOAD_LLM_SCHEMAS=false

# Database settings
DATABASE_TYPE=sqlite
DATABASE_URL=./session/zaileys.db
```

### 2. Installation

```bash
pnpm install
```

### 3. Run the Bot

```bash
node index.js
```

## 📋 Configuration Options

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `RECONNECT_MAX_RETRIES` | `10` | Maximum reconnection attempts |
| `RECONNECT_RETRY_DELAY` | `30000` | Delay between reconnection attempts (ms) |
| `CLIENT_AUTH_TYPE` | `qr` | Authentication method |
| `CLIENT_PREFIX` | `/` | Command prefix for bot commands |
| `CLIENT_IGNORE_ME` | `false` | Ignore messages sent by the bot itself |
| `CLIENT_SHOW_LOGS` | `true` | Show initialization logs and spinners |
| `CLIENT_AUTO_READ` | `true` | Automatically mark messages as read |
| `CLIENT_AUTO_ONLINE` | `true` | Set online presence on connection |
| `CLIENT_AUTO_PRESENCE` | `true` | Send typing/recording indicators |
| `CLIENT_AUTO_REJECT_CALL` | `true` | Automatically reject incoming calls |
| `CLIENT_LOAD_LLM_SCHEMAS` | `false` | Enable LLM/AI features |
| `DATABASE_TYPE` | `sqlite` | Database type (sqlite, postgresql, mysql) |
| `DATABASE_URL` | `./session/zaileys.db` | Database connection string |

## 🔧 Features

- **Message Archiving**: Automatically saves all incoming messages
- **View Once Media**: Captures and stores view-once images/videos
- **Story Monitoring**: Monitors and archives WhatsApp stories
- **Stealth Mode**: Operates without sending read receipts or online status
- **Automatic Reconnection**: Handles connection drops gracefully
- **Comprehensive Logging**: Detailed logs for debugging and monitoring

## 📁 Project Structure

See [STRUCTURE.md](docs/STRUCTURE.md) for detailed project structure documentation.

## 🔒 Security

- The `.env` file contains sensitive configuration and is excluded from version control
- Session data is stored locally in the `session/` directory
- All media files are stored locally and not uploaded to external services

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
