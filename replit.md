# Discord Music Bot

A fully-featured Discord music bot built with Node.js that plays music in voice channels.

## Architecture

- **Runtime**: Node.js 20
- **Main entry**: `src/index.js`
- **Structure**:
  - `src/commands/` — Slash command handlers
  - `src/events/` — Discord event handlers  
  - `src/utils/` — Music player engine and utilities

## Key Dependencies

- `discord.js` v14 — Discord API integration
- `@discordjs/voice` — Voice channel audio streaming
- `play-dl` — YouTube audio stream extraction
- `opusscript` — Opus audio encoding (pure JS)
- `libsodium-wrappers` — Encryption for voice
- `ffmpeg-static` — Audio transcoding

## Slash Commands

| Command | Description |
|---------|-------------|
| `/play <query>` | Play a YouTube URL or search query |
| `/skip` | Skip the current song |
| `/stop` | Stop and clear the queue |
| `/pause` | Pause playback |
| `/resume` | Resume paused playback |
| `/queue [page]` | View the song queue |
| `/nowplaying` | Show current song info |
| `/volume <1-100>` | Set playback volume |
| `/leave` | Disconnect bot from voice channel |

## Environment Variables

- `DISCORD_TOKEN` — Bot token from Discord Developer Portal (secret)
- `DISCORD_CLIENT_ID` — Application/Client ID (secret)

## Workflow

The bot runs via the "Discord Music Bot" workflow using `node src/index.js`.
Slash commands are registered globally with Discord's API on every startup.
