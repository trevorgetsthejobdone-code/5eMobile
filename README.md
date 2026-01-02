# 5eMobile Sync

A Foundry VTT module that syncs character data to the 5eMobile Electron app, allowing players to access their character sheets on mobile devices using Foundry's authentication system.

## Architecture Overview

The module follows this flow:

```
Foundry VTT → Module (main.js) → Mobile Sheet (MobileSheet.js) → Sync System (sync.js) → Electron App
                                                                                              ↓
Electron App → Polling System → Action Handlers → Foundry Updates
```

### Key Components

- **main.js**: Module initialization, sheet registration, UI suppression
- **MobileSheet.js**: Mobile-optimized character sheet UI
- **sync.js**: Main sync orchestration and polling
- **sync-core.js**: Core sync functions (actor serialization, sending data)
- **sync-actions.js**: Action handlers for player requests (rolls, items, rests, etc.)
- **sync-combat.js**: Combat state and chat message handling
- **sync-queue.js**: Offline action queue system
- **utils.js**: Utility functions (mobile detection, formatting, error handling)

## Installation

1. Copy this folder to your Foundry VTT `Data/modules/` directory
2. Restart Foundry VTT
3. Enable the module in your World settings

## Configuration

1. Go to **Configure Settings → Module Settings → 5eMobile Sync**
2. Configure the following settings:
   - **5eMobile URL** (default: `http://localhost:3000`)
     - This should match the URL where your Electron app is listening
   - **Auto Sync** (default: enabled)
     - Automatically sync characters when they are updated
   - **Polling Interval (ms)** (default: 2000ms)
     - How often to poll for pending actions from Electron app
     - Lower values = more responsive but higher server load
     - Range: 500-10000ms
   - **Server Check Interval (ms)** (default: 5000ms)
     - How often to check if Electron app server is available
     - Used for connection status indicator
     - Range: 1000-30000ms

## Usage

### Enabling Sync for a Character

1. Open a character sheet
2. Click the **"Enable 5eMobile Sync"** button in the header
3. The character will be synced to the Electron app

### Manual Sync

- Click the **"Sync to 5eMobile"** button on any synced character sheet

### Disabling Sync

- Click the **"Disable 5eMobile Sync"** button on the character sheet

## Authentication

5eMobile uses an access code system for player authentication:

- The GM's Electron app generates a 6-digit access code
- Players enter this code in the web interface to authenticate
- Codes expire 24 hours after generation
- Sessions last 8 hours of inactivity

**Character Ownership:**
- Characters are filtered by Foundry user ownership
- Players can only access characters assigned to them
- The module sends owner information with character data
- Ownership is determined by the character's assigned user in Foundry

## How It Works

### Data Flow from Foundry to Electron App

1. **Character Updates**: The module hooks into Foundry's actor update events (`updateActor`, `updateItem`, `deleteActor`)
2. **Debouncing**: Rapid updates are debounced (500ms delay) to prevent excessive syncing
3. **Serialization**: Character data is serialized to JSON format
4. **HTTP POST**: Data is sent to the Electron app's `/api/character/update` endpoint
5. **Real-time Updates**: The Electron app receives the data and updates the character sheet

### Data Flow from Electron App to Foundry

Since Foundry modules cannot directly receive HTTP requests, the module uses a **polling mechanism**:

1. **Polling**: Every 2 seconds (configurable), the module polls `/api/pending-actions` for pending actions
2. **Action Processing**: Actions are processed by appropriate handlers (rolls, item usage, rests, etc.)
3. **Result Sending**: Results are sent back to `/api/action-result`
4. **Offline Queue**: If the Electron app is unavailable, actions are queued and processed when connection is restored

### Character Ownership Filtering

- Characters are filtered by Foundry user ownership
- Only characters with OWNER permission (level 3) are synced
- The module sends owner information (`ownerId`, `owner`) with character data
- Players can only access characters assigned to them in Foundry

## Troubleshooting

### Common Issues

**"5eMobile app disconnected" notification**
- Ensure the Electron app is running
- Check that the URL in settings matches the app's listening address
- Verify firewall/network settings allow connections

**Character not syncing**
- Verify sync is enabled for the character (check character sheet header)
- Check that the character has an owner assigned in Foundry
- Ensure Auto Sync is enabled in module settings

**Actions not working from mobile app**
- Check that polling is active (should see periodic requests in browser console)
- Verify the Electron app is receiving polling requests
- Check browser console for error messages

**Sync status indicator shows disconnected**
- The indicator checks server availability every 5 seconds (configurable)
- If the app is running but shows disconnected, check the server URL setting
- The indicator may take a few seconds to update after starting the app

### Debug Mode

Enable browser console logging to see detailed sync information:
- Open browser console (F12)
- Look for messages prefixed with `[5eMobile]`
- Check for error messages with context information

## Module Settings Reference

| Setting | Default | Description |
|---------|---------|-------------|
| 5eMobile URL | `http://localhost:3000` | URL where Electron app is listening |
| Auto Sync | `true` | Automatically sync characters on update |
| Polling Interval | `2000ms` | How often to poll for pending actions |
| Server Check Interval | `5000ms` | How often to check server availability |

## Requirements

- Foundry VTT v11+ (verified on v13)
- D&D 5e system
- 5eMobile Electron app running and listening on the configured URL

## Technical Details

### Sync Behavior

- **Debouncing**: Character updates are debounced by 500ms to prevent excessive syncing
- **Offline Queue**: Actions are queued when the Electron app is unavailable (max 100 actions)
- **Error Handling**: All sync errors are logged with context (character name, action type, etc.)
- **Notifications**: Users are notified of sync status (success, error, connection status)

### Security

- All actions are validated before processing
- Permission checks ensure users can only modify their own characters
- Character ownership is verified before syncing
- Input sanitization prevents malicious data injection

### Performance

- Polling intervals are configurable to balance responsiveness and server load
- Debouncing reduces unnecessary network traffic
- Selective sync flags allow per-character sync configuration (planned)

