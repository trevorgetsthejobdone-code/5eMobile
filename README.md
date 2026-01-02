# 5eMobile

A Foundry VTT module that provides a mobile-first, full-screen character sheet experience for D&D 5e players. When players with flagged characters log in, the module automatically intercepts their session and displays an optimized mobile interface, hiding the standard Foundry VTT UI and focusing exclusively on character management and gameplay actions.

## Overview

5eMobile transforms the Foundry VTT experience for mobile players by providing a dedicated, streamlined interface designed specifically for character sheet management on mobile devices. The module automatically detects when a player with a flagged character logs in and seamlessly transitions them to a full-screen mobile interface optimized for touch interactions and smaller screens.

## Features

### Core Functionality

- **Automatic Login Interception**: When a player with a flagged character logs into Foundry VTT, the module automatically detects their session and switches to the mobile interface
- **Full-Screen Character Sheet**: Hides the standard Foundry VTT interface (sidebar, canvas, etc.) and displays only the character sheet in full-screen mode
- **First Character Auto-Display**: Automatically displays the first character assigned to the player upon login
- **Character Creation Support**: If no characters are assigned, players are prompted to create a character (with GM-provided code if required)

### Character Management

- **Complete Character Sheet Access**: Full access to all character information including:
  - Ability scores and modifiers
  - Saving throws with proficiency tracking
  - Skill proficiencies and modifiers
  - Hit points (current/max/temp) with visual indicators
  - Armor Class with effect modifiers
  - Speed and movement tracking
  - Hit dice tracking
  - Inspiration tracking
  - Conditions and active effects
  - Resistances and immunities
  - Senses (darkvision, passive perception, etc.)

### Combat & Actions

- **Dice Rolling System**: Comprehensive dice rolling with automatic calculation:
  - Ability checks
  - Saving throws
  - Skill checks
  - Attack rolls
  - Damage rolls
  - Custom rolls with modifiers
- **Weapon Management**: 
  - View equipped weapons
  - Roll attack and damage
  - Track ammunition
  - Weapon properties display
- **Spell Casting**:
  - Browse spells by level (cantrips through 9th level)
  - Track spell slots per level
  - Automatic spell slot consumption on casting
  - Spell details and descriptions
  - Spell effect tracking
- **Item Management**:
  - Inventory organization (equipped, backpack, containers)
  - Item filtering by type (weapon, armor, equipment, consumable, wondrous)
  - Item usage tracking
  - Attunement management (with 3-slot limit)
  - Consumable charge tracking

### Resource Tracking

- **Spell Slot Tracking**: Automatic tracking of spell slots per level with visual indicators
- **Hit Point Management**: Real-time HP tracking with bloodied state indicators
- **Hit Dice Tracking**: Track available hit dice for short rest healing
- **Skill Effect Tracking**: Automatic detection and application of spell effects on:
  - Ability scores
  - Armor Class
  - Speed
  - Hit points
  - Saving throws
- **Active Effect Monitoring**: Real-time tracking of active conditions and spell effects

### Rest System

- **Short Rest**: 
  - Spend hit dice to recover HP
  - Restore short rest resources
  - Hit dice rolling with Constitution modifier
- **Long Rest**:
  - Full HP restoration
  - Spell slot restoration
  - Hit dice restoration (up to half maximum)
  - Resource restoration
  - Exhaustion reduction

### User Interface

- **Mobile-Optimized Design**: Touch-friendly interface with large buttons and intuitive navigation
- **Split-Pane Layout**: "Open Book" interface with dual-pane navigation for efficient information access
- **Tabbed Navigation**: Organized tabs for Actions, Inventory, Biography, and Features
- **Filtering System**: Advanced filtering for actions and inventory by type, container, and category
- **Overlay System**: Detailed views for items, spells, and character information
- **Responsive Design**: Adapts to various screen sizes and orientations

### Real-Time Synchronization

- **Automatic Updates**: Character data automatically syncs when changes are made
- **Debounced Syncing**: Intelligent update batching to prevent excessive network traffic
- **Offline Queue**: Actions are queued when connection is unavailable and processed when restored
- **Connection Status**: Visual indicators show sync status and connection health

### Security & Permissions

- **Character Ownership Validation**: Players can only access characters assigned to them
- **Permission Checks**: All actions are validated against Foundry VTT permissions
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Input Sanitization**: All user inputs are validated and sanitized

## Installation

### For Game Masters

1. Download the module files
2. Copy the entire `5eMobile` folder to your Foundry VTT `Data/modules/` directory
3. Restart Foundry VTT (or use the "Reload Application" button)
4. Navigate to **Configure Settings → Manage Modules**
5. Enable the **5eMobile** module
6. Configure module settings (see Configuration section below)

### System Requirements

- **Foundry VTT**: Version 11.0 or higher (verified on v13)
- **D&D 5e System**: Version 4.4.0 or higher (verified on 5.0.2)
- **Browser**: Modern browser with JavaScript enabled (Chrome, Firefox, Edge, Safari)

## Configuration

### Module Settings

Access module settings via **Configure Settings → Module Settings → 5eMobile**:

#### Client Settings (Per-User)

- **Force Mobile Sheet** (default: `false`)
  - Always use mobile sheet regardless of device detection
  - Useful for testing or desktop users who prefer the mobile interface

- **Suppress Foundry UI on Mobile** (default: `true`)
  - Hide sidebar and canvas when mobile sheet is active
  - Provides true full-screen experience

#### World Settings (GM Only)

- **Auto Sync** (default: `true`)
  - Automatically sync characters when they are updated
  - Disable for manual sync control

- **Polling Interval (ms)** (default: `2000ms`)
  - How often to poll for pending actions
  - Lower values = more responsive but higher server load
  - Range: 500-10000ms

- **Server Check Interval (ms)** (default: `5000ms`)
  - How often to check server availability
  - Used for connection status indicator
  - Range: 1000-30000ms

## Usage

### For Game Masters: Flagging Characters

To enable the mobile interface for a player's character:

1. Open the character sheet
2. Click the **"Enable 5eMobile Sync"** button in the sheet header
3. The character is now flagged for mobile access
4. Assign the character to the appropriate player in Foundry VTT's user management

**Note**: Only characters with OWNER permission (level 3) for a player will be accessible via the mobile interface.

### For Players: First Login

1. Log into Foundry VTT with your assigned user account
2. The module automatically detects if you have any flagged characters
3. If you have assigned characters:
   - The standard Foundry interface is hidden
   - Your first assigned character's sheet opens automatically in full-screen mode
4. If you have no assigned characters:
   - You'll be prompted to create a character
   - If your GM has provided a character creation code, enter it when prompted
   - Once created, the character will be automatically flagged and displayed

### Character Sheet Navigation

The mobile character sheet uses a split-pane "Open Book" layout:

- **Left Pane**: Primary actions and information
  - **Actions Tab**: Weapons, spells, and basic actions
  - **Inventory Tab**: Items, equipment, and containers
  
- **Right Pane**: Secondary information
  - **Bio Tab**: Character biography, race, background, alignment
  - **Features Tab**: Class features, feats, and racial traits

### Performing Actions

#### Rolling Dice

- **Ability Checks**: Tap ability scores in the header to roll
- **Saving Throws**: Tap saving throw modifiers in the header
- **Skill Checks**: Access via the actions tab
- **Attack Rolls**: Tap weapon names or attack buttons
- **Spell Rolls**: Tap spell names to view details, then cast

#### Managing Items

- **View Item Details**: Tap any item name to see full description
- **Equip/Unequip**: Use the toggle button on item rows
- **Attune Items**: Tap the attunement button (limited to 3 attuned items)
- **Use Consumables**: Tap the use button to consume charges

#### Casting Spells

- **Browse Spells**: Navigate to Actions tab, then select spell level
- **View Spell Details**: Tap spell name to see full description
- **Cast Spell**: Tap the cast button (spell slots automatically consumed)
- **Track Slots**: Visual indicators show remaining slots per level

#### Taking Rests

- **Short Rest**: Tap the HP display or rest button, then roll hit dice
- **Long Rest**: Access via rest modal, fully restores HP, slots, and resources

### Character Creation (If No Characters Assigned)

If a player logs in without any assigned characters:

1. A character creation prompt appears
2. If the GM has enabled character creation codes, enter the provided code
3. Follow the character creation wizard
4. Once created, the character is automatically:
   - Assigned to the player
   - Flagged for mobile access
   - Displayed in the mobile interface

## Technical Architecture

### Module Structure

```
5eMobile/
├── scripts/
│   ├── main.js              # Module initialization, sheet registration, UI suppression
│   ├── MobileSheet.js       # Mobile-optimized character sheet UI
│   ├── sync.js              # Main sync orchestration and polling
│   ├── sync-core.js         # Core sync functions (actor serialization, data transmission)
│   ├── sync-actions.js      # Action handlers (rolls, items, rests, etc.)
│   ├── sync-combat.js       # Combat state and chat message handling
│   ├── sync-queue.js        # Offline action queue system
│   ├── sync-websocket.js    # WebSocket communication (if available)
│   ├── SpellEffectDetector.js # Spell effect detection and tracking
│   └── utils.js             # Utility functions (mobile detection, formatting, error handling)
├── templates/
│   ├── sheet.hbs            # Main sheet template
│   ├── header.hbs           # Character header template
│   ├── tab-actions.hbs      # Actions tab template
│   ├── tab-inventory.hbs    # Inventory tab template
│   ├── tab-bio.hbs          # Biography tab template
│   └── tab-features.hbs     # Features tab template
├── styles/
│   └── mobile-sheet.css     # Mobile-optimized stylesheet
└── data/
    ├── spell-categories.json # Spell effect categorization
    └── spell-inventory.json  # Spell effect inventory
```

### Data Flow

#### Character Updates (Foundry → Module)

1. **Event Hooks**: Module hooks into Foundry's actor update events
2. **Debouncing**: Rapid updates are debounced (500ms delay) to prevent excessive processing
3. **Flag Checking**: Only characters with `5eMobile.sync` flag are processed
4. **UI Update**: Character sheet automatically refreshes with new data

#### Action Processing (Player → Foundry)

1. **User Interaction**: Player performs action in mobile interface
2. **Action Validation**: Action is validated against permissions and character ownership
3. **Foundry API**: Action is executed via Foundry VTT's native APIs
4. **Result Display**: Results are displayed in chat and on character sheet
5. **Auto-Sync**: Character data automatically syncs after action completion

### Mobile Detection

The module uses multiple methods to detect mobile devices:

- **User Agent Detection**: Checks browser user agent for mobile identifiers
- **Viewport Size**: Detects screen dimensions typical of mobile devices
- **Touch Capability**: Checks for touch input support
- **Configuration Override**: GM can force mobile sheet for all users

### Spell Effect Detection

The module includes an advanced spell effect detection system:

- **Active Effect Monitoring**: Tracks all active effects on characters
- **Spell Matching**: Matches effects to spells by UUID or name
- **Effect Calculation**: Calculates modifiers for:
  - Ability scores
  - Armor Class
  - Speed (multipliers and flat bonuses)
  - Hit points
  - Saving throws
- **Real-Time Updates**: Effect modifiers update automatically as effects are added/removed

## Troubleshooting

### Common Issues

#### Mobile Interface Not Appearing

**Symptoms**: Standard Foundry interface shows instead of mobile sheet

**Solutions**:
- Verify the character is flagged for mobile (check character sheet header for "Enable 5eMobile Sync" button)
- Check that "Suppress Foundry UI on Mobile" is enabled in module settings
- Ensure "Force Mobile Sheet" is enabled if testing on desktop
- Verify mobile device detection (check browser console for detection messages)
- Clear browser cache and reload

#### Character Not Displaying on Login

**Symptoms**: Player logs in but no character appears

**Solutions**:
- Verify character is assigned to the player in Foundry VTT user management
- Check that character has OWNER permission (level 3) for the player
- Ensure character is flagged for mobile (GM must enable sync on character sheet)
- Check browser console for error messages
- Verify player has at least one flagged character assigned

#### Actions Not Working

**Symptoms**: Buttons don't respond or actions fail

**Solutions**:
- Check browser console for JavaScript errors
- Verify player has proper permissions for the character
- Ensure character data is valid (no corrupted data)
- Try refreshing the page
- Check that Foundry VTT is not in a paused/error state

#### Spell Effects Not Showing

**Symptoms**: Spell effect modifiers not appearing in character stats

**Solutions**:
- Verify active effects are properly applied to the character
- Check that spell data files are loaded (check browser console)
- Ensure effects have valid origins (linked to spells)
- Manually refresh character sheet
- Check that SpellEffectDetector loaded successfully

#### Sync Status Shows Disconnected

**Symptoms**: Sync status indicator shows disconnected state

**Solutions**:
- This is normal if no external sync server is configured
- The module works fully offline - sync status is for optional external services
- Check module settings for sync URL configuration (if using external sync)

### Debug Mode

To enable detailed logging:

1. Open browser console (F12)
2. Look for messages prefixed with `[5eMobile]`
3. Check for error messages with context information
4. Verify mobile detection: `isMobileDevice()` function results
5. Check character flags: `actor.getFlag('5eMobile', 'sync')`

### Performance Optimization

If experiencing performance issues:

- **Increase Polling Interval**: Reduce polling frequency in module settings
- **Disable Auto-Sync**: Switch to manual sync for less frequent updates
- **Reduce Active Effects**: Limit number of active effects on characters
- **Clear Browser Cache**: Remove cached data that may be outdated
- **Close Other Tabs**: Free up browser resources

## Module Settings Reference

| Setting | Scope | Default | Description |
|---------|-------|---------|-------------|
| Force Mobile Sheet | Client | `false` | Always use mobile sheet regardless of device |
| Suppress Foundry UI on Mobile | Client | `true` | Hide sidebar and canvas when mobile sheet is active |
| Auto Sync | World | `true` | Automatically sync characters on update |
| Polling Interval (ms) | World | `2000` | How often to poll for pending actions (500-10000ms) |
| Server Check Interval (ms) | World | `5000` | How often to check server availability (1000-30000ms) |

## Feature Details

### Dice Rolling System

The module provides comprehensive dice rolling capabilities:

- **Automatic Modifier Calculation**: All rolls include appropriate ability modifiers, proficiency bonuses, and effect modifiers
- **Roll Display**: Results are displayed in Foundry's chat with formatted dice results
- **Roll Types Supported**:
  - Ability checks (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma)
  - Saving throws (all abilities with proficiency tracking)
  - Skill checks (all 18 skills with proficiency/expertise)
  - Attack rolls (with weapon properties)
  - Damage rolls (with damage types)
  - Custom rolls (with user-specified formulas)

### Inventory Management

Advanced inventory features:

- **Container Organization**: Items organized by container (Equipped, Backpack, Quiver, etc.)
- **Type Filtering**: Filter by item type (Weapon, Armor, Equipment, Consumable, Wondrous)
- **Attunement Tracking**: Visual indicators for attuned items with 3-slot limit
- **Quantity Management**: Track item quantities and charges
- **Item Details**: Full item descriptions with properties and effects

### Spell Management

Comprehensive spell tracking:

- **Spell Slot Tracking**: Visual indicators for available spell slots per level
- **Automatic Slot Consumption**: Slots automatically decrement when spells are cast
- **Spell Organization**: Spells grouped by level (Cantrips, 1st-9th level)
- **Spell Details**: Full spell descriptions with casting time, range, components, duration
- **Spell Effects**: Automatic detection of spell effects on character statistics

### Effect Tracking

Real-time effect monitoring:

- **Active Effect Detection**: Automatically detects all active effects on characters
- **Stat Modifier Calculation**: Calculates and displays effect modifiers for:
  - Ability scores
  - Armor Class
  - Speed (with multipliers and flat bonuses)
  - Hit points (current and maximum)
  - Saving throws (per ability)
- **Visual Indicators**: Modified stats display base value and effect modifier separately
- **Effect Updates**: Modifiers update in real-time as effects are added or removed

## Security Considerations

- **Permission Validation**: All actions are validated against Foundry VTT's permission system
- **Character Ownership**: Players can only access characters assigned to them
- **Input Sanitization**: All user inputs are validated and sanitized before processing
- **Rate Limiting**: Built-in rate limiting prevents action spam (10 actions per second per user)
- **Error Handling**: Comprehensive error handling prevents data corruption

## Performance Characteristics

- **Debounced Updates**: Character updates are debounced (500ms) to prevent excessive processing
- **Selective Rendering**: Only visible portions of the character sheet are re-rendered on updates
- **Caching**: Template rendering is cached to improve performance
- **Adaptive Polling**: Polling intervals adjust based on activity levels
- **Offline Support**: Actions are queued when offline and processed when connection is restored

## Compatibility

### Verified Compatibility

- **Foundry VTT**: v11.0+ (verified on v13.0)
- **D&D 5e System**: v4.4.0+ (verified on v5.0.2)
- **Browsers**: Chrome, Firefox, Edge, Safari (latest versions)

### Known Limitations

- Requires D&D 5e system (not compatible with other game systems)
- Mobile interface optimized for touch devices (may be less optimal on desktop)
- Some advanced Foundry features may not be accessible in mobile mode
- External sync features require additional server setup (optional)

## Support & Contributing

For bug reports, feature requests, or contributions, please refer to the project's issue tracker and contribution guidelines.

## License

MIT License - See LICENSE file for details

## Credits

Developed for the Foundry VTT community to enhance mobile gameplay experiences for D&D 5e.

---

**Note**: This module is designed to work seamlessly with Foundry VTT's native systems. It does not require any external applications or servers to function. The sync features mentioned in some settings are for optional external integration and are not required for core functionality.
