/**
 * 5eMobile Sync Module
 * Sends character data to the 5eMobile Electron app
 * Receives action requests (rolls, item usage, etc.) from Electron app
 */

import { handleSyncError } from './utils.js';
import { actorToJSON, getCharacterOwner, sendActor, sendToElectronApp, checkServerAvailability, syncAllCharacters } from './sync-core.js';
import {
  handleRollRequest,
  handleItemAction,
  handleRestRequest,
  handleCharacterUpdate,
  handleCharacterCreation,
  handleCompendiumRequest,
  handleLevelUp,
  handleAddItem,
  handleCharacterDataUpdate,
  actionHandlers,
  validateActionData
} from './sync-actions.js';
import {
  sendCombatState,
  sendChatMessage,
  handleChatMessage,
  handleCombatAction
} from './sync-combat.js';

// Import WebSocket function (with fallback)
let sendWebSocketFn = null;
async function getSendWebSocket() {
  if (sendWebSocketFn === null) {
    try {
      const wsModule = await import('./sync-websocket.js');
      sendWebSocketFn = wsModule.sendWebSocket || (() => false);
    } catch (error) {
      sendWebSocketFn = () => false; // Fallback if WebSocket module doesn't exist
    }
  }
  return sendWebSocketFn;
}

const MODULE_ID = '5eMobile';

/**
 * Notify user of sync status
 * @param {string} message - Notification message
 * @param {string} type - Notification type: 'info', 'success', 'warning', 'error'
 */
function notifySyncStatus(message, type = 'info') {
  if (!ui?.notifications) return;
  
  const notificationTypes = {
    info: ui.notifications.info,
    success: ui.notifications.info, // Foundry doesn't have success, use info
    warning: ui.notifications.warn,
    error: ui.notifications.error
  };
  
  const notify = notificationTypes[type] || notificationTypes.info;
  notify(message);
}


/**
 * Initialize settings
 */
function initSettings() {
  game.settings.register(MODULE_ID, 'syncUrl', {
    name: '5eMobile URL',
    hint: 'URL of the 5eMobile Electron app (default: http://localhost:3000)',
    scope: 'world',
    config: true,
    type: String,
    default: 'http://localhost:3000',
    requiresReload: false
  });

  game.settings.register(MODULE_ID, 'autoSync', {
    name: 'Auto Sync',
    hint: 'Automatically sync characters when they are updated',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false
  });

  game.settings.register(MODULE_ID, 'pollingInterval', {
    name: 'Polling Interval (ms)',
    hint: 'How often to poll for pending actions from Electron app (default: 2000ms). Lower values = more responsive but higher server load.',
    scope: 'world',
    config: true,
    type: Number,
    default: 2000,
    range: {
      min: 500,
      max: 10000,
      step: 500
    },
    requiresReload: false
  });

  game.settings.register(MODULE_ID, 'serverCheckInterval', {
    name: 'Server Check Interval (ms)',
    hint: 'How often to check if Electron app server is available (default: 5000ms). Used for connection status indicator.',
    scope: 'world',
    config: true,
    type: Number,
    default: 5000,
    range: {
      min: 1000,
      max: 30000,
      step: 1000
    },
    requiresReload: false
  });
}

/**
 * Add sync controls to character sheet
 */
function addSheetControls() {
  Hooks.on('getHeaderControlsPrimarySheet5e', (actorSheet, buttons) => {
    const actor = actorSheet.actor;
    const isSyncing = actor.getFlag(MODULE_ID, 'sync');

    if (isSyncing) {
      buttons.unshift({
        icon: 'fa-solid fa-mobile-screen-button',
        label: 'Disable 5eMobile Sync',
        action: '5eMobileDisableSync',
        visible: true
      });
      buttons.unshift({
        icon: 'fa-solid fa-sync',
        label: 'Sync to 5eMobile',
        action: '5eMobileSync',
        visible: true
      });
    } else {
      buttons.unshift({
        icon: 'fa-solid fa-mobile-screen-button',
        label: 'Enable 5eMobile Sync',
        action: '5eMobileEnableSync',
        visible: true
      });
    }

    // Handle button actions
    actorSheet.options.actions['5eMobileEnableSync'] = () => {
      actor.setFlag(MODULE_ID, 'sync', true);
      ui.notifications?.info(`5eMobile sync enabled for ${actor.name}`);
      sendActor(actor);
    };

    actorSheet.options.actions['5eMobileDisableSync'] = () => {
      actor.setFlag(MODULE_ID, 'sync', false);
      ui.notifications?.info(`5eMobile sync disabled for ${actor.name}`);
      sendActor(actor, 'delete');
    };

    actorSheet.options.actions['5eMobileSync'] = () => {
      sendActor(actor);
      ui.notifications?.info(`Synced ${actor.name} to 5eMobile`);
    };
  });
}


/**
 * Task 4.1.3: Send effect update to Electron app
 */
function sendEffectUpdate(effect, action) {
  if (!effect || !effect.parent) return;
  
  const actor = effect.parent;
  // Only sync if actor is a synced character
  if (actor.type !== 'character' || !actor.getFlag(MODULE_ID, 'sync')) {
    return;
  }
  
  const effectData = {
    id: effect.id,
    actorId: actor.id,
    name: effect.name,
    label: effect.label,
    icon: effect.icon,
    changes: effect.changes || [],
    duration: effect.duration || {},
    action: action // 'create', 'update', 'delete'
  };
  
  sendToElectronApp({
    type: 'effect-update',
    world_id: game.world.id,
    data: effectData
  });
}


/**
 * Debounce sync calls per character
 */
const debounceTimers = new Map();

/**
 * Debounce sync for character updates
 * @param {Actor} actor - Actor to sync
 * @param {number} delay - Delay in milliseconds (default: 500ms)
 */
function debounceSync(actor, delay = 500) {
  const characterId = actor.id;
  
  // Clear existing timer for this character
  if (debounceTimers.has(characterId)) {
    clearTimeout(debounceTimers.get(characterId));
  }
  
  // Set new timer
  const timer = setTimeout(() => {
    sendActor(actor);
    debounceTimers.delete(characterId);
  }, delay);
  
  debounceTimers.set(characterId, timer);
}

/**
 * Start the sync system
 */
function startSync() {
  const autoSync = game.settings.get(MODULE_ID, 'autoSync');

  if (autoSync) {
    // Hook into actor updates
    Hooks.on('updateActor', (actor, changes, options, userId) => {
      // Only sync if the update came from a user (not system)
      if (userId && game.userId === userId) {
        // Check if ownership changed - sync immediately
        if (changes.ownership) {
          // Ownership changed, re-sync character with new owner immediately
          sendActor(actor);
        } else {
          // Debounce regular updates
          debounceSync(actor, 500);
        }
      }
    });

    // Hook into actor deletions
    Hooks.on('deleteActor', (actor, options, userId) => {
      if (userId && game.userId === userId) {
        sendActor(actor, 'delete');
      }
    });

    // Hook into item updates (spells, weapons, etc.)
    Hooks.on('updateItem', (item, changes, options, userId) => {
      if (userId && game.userId === userId && item.actor) {
        const actor = item.actor;
        if (actor.type === 'character' && actor.getFlag(MODULE_ID, 'sync')) {
          // Debounce item updates
          debounceSync(actor, 500);
        }
      }
    });

    // Task 4.1.1: Hook into combat updates
    Hooks.on('updateCombat', (combat, changes, options, userId) => {
      sendCombatState(combat);
    });

    Hooks.on('createCombat', (combat, options, userId) => {
      sendCombatState(combat);
    });

    Hooks.on('deleteCombat', (combat, options, userId) => {
      sendCombatState(null); // Send null to indicate combat ended
    });

    // Task 4.1.2: Hook into chat messages
    Hooks.on('createChatMessage', (message, options, userId) => {
      sendChatMessage(message);
    });

    // Task 4.1.3: Hook into active effect updates
    Hooks.on('createActiveEffect', (effect, options, userId) => {
      if (effect.parent) {
        sendEffectUpdate(effect, 'create');
      }
    });

    Hooks.on('updateActiveEffect', (effect, changes, options, userId) => {
      if (effect.parent) {
        sendEffectUpdate(effect, 'update');
      }
    });

    Hooks.on('deleteActiveEffect', (effect, options, userId) => {
      if (effect.parent) {
        sendEffectUpdate(effect, 'delete');
      }
    });

    // Task 4.1.4: Enhanced real-time sync for critical updates
    Hooks.on('preUpdateActor', (actor, changes, options, userId) => {
      // Immediate sync for critical updates
      if (userId && game.userId === userId && actor.type === 'character' && actor.getFlag(MODULE_ID, 'sync')) {
        const criticalFields = ['system.attributes.hp.value', 'system.attributes.death.success', 'system.attributes.death.failure'];
        const hasCriticalUpdate = Object.keys(changes).some(key => 
          criticalFields.some(field => key.startsWith(field))
        );
        
        if (hasCriticalUpdate) {
          // Immediate sync for critical updates
          setTimeout(() => sendActor(actor), 100);
        }
      }
    });

    // Initial sync of all enabled characters
    Hooks.once('ready', () => {
      setTimeout(() => {
        syncAllCharacters();
        // Send initial combat state if combat is active
        const activeCombat = game.combat;
        if (activeCombat) {
          sendCombatState(activeCombat);
        }
      }, 2000); // Wait 2 seconds for everything to initialize
    });
  }
}

// Initialize on init
Hooks.on('init', () => {
  initSettings();
});





/**
 * Poll Electron app for pending actions
 * Task 3.1.3: Polling approach since Foundry modules can't receive HTTP requests
 */
let pollingInterval = null;

/**
 * Rate limiting: Track action frequency per user
 */
const rateLimitTracker = new Map();
const RATE_LIMIT_MAX_ACTIONS = 10;
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second

/**
 * Check if user has exceeded rate limit
 * @param {string} userId - User ID
 * @returns {boolean} True if rate limit exceeded
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const userActions = rateLimitTracker.get(userId) || [];
  
  // Remove actions outside the time window
  const recentActions = userActions.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS);
  
  if (recentActions.length >= RATE_LIMIT_MAX_ACTIONS) {
    return true; // Rate limit exceeded
  }
  
  // Add current action
  recentActions.push(now);
  rateLimitTracker.set(userId, recentActions);
  
  return false; // Within rate limit
}

function startActionPolling() {
  const syncUrl = game.settings.get(MODULE_ID, 'syncUrl') || 'http://localhost:3000';
  const pollingIntervalMs = game.settings.get(MODULE_ID, 'pollingInterval') || 2000;
  
  // Poll for pending actions at configured interval
  pollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`${syncUrl}/api/pending-actions`);
      if (!response.ok) return;
      
      const data = await response.json();
      if (!data.success || !data.actions || data.actions.length === 0) {
        return;
      }

      // Process each pending action
      for (const action of data.actions) {
        try {
          let result = null;
          
          if (action.type === 'roll') {
            // Extract roll data from action
            result = await handleRollRequest({
              characterId: action.characterId,
              rollType: action.rollType,
              rollResult: action.rollResult,
              options: action.options
            });
          } else if (action.type === 'item-action') {
            // Extract item action data
            result = await handleItemAction({
              characterId: action.characterId,
              itemId: action.itemId,
              action: action.action,
              options: action.options
            });
          } else if (action.type === 'rest') {
            // Extract rest data
            result = await handleRestRequest({
              characterId: action.characterId,
              restType: action.restType
            });
          } else if (action.type === 'character-update') {
            // Extract update data
            result = await handleCharacterUpdate({
              characterId: action.characterId,
              updates: action.updates
            });
          } else if (action.type === 'chat-message') {
            // Task 4.2.4: Handle chat message
            result = await handleChatMessage({
              characterId: action.characterId,
              content: action.content,
              type: action.messageType || 'text'
            });
          } else if (action.type === 'combat-action') {
            // Task 4.3.4 & 4.3.5: Handle combat actions
            result = await handleCombatAction({
              characterId: action.characterId,
              action: action.action,
              options: action.options || {}
            });
          } else if (action.type === 'character-creation') {
            // Task 6.1.11: Handle character creation
            result = await handleCharacterCreation(action.characterData);
          } else if (action.type === 'compendium-request') {
            // Task 6.1.3, 6.1.4, 6.1.5: Handle compendium requests
            result = await handleCompendiumRequest(action);
          } else if (action.type === 'level-up') {
            // Task 6.2.7: Handle level up
            result = await handleLevelUp(action);
          } else if (action.type === 'add-item') {
            // Task 6.3.6 & 6.4.2: Handle add item
            result = await handleAddItem(action);
          } else if (action.type === 'update-character-data') {
            // Task 6.3.1: Handle character data update
            result = await handleCharacterDataUpdate(action);
          }

          // Send result back to Electron app
          if (result && action.actionId) {
            const resultData = {
              type: 'action-result',
              actionId: action.actionId,
              result: result
            };
            
            // Try WebSocket first, fall back to HTTP
            const sendWebSocket = await getSendWebSocket();
            if (!sendWebSocket(resultData)) {
              await fetch(`${syncUrl}/api/action-result`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resultData)
              });
            }
          }
        } catch (error) {
          handleSyncError(error, {
            actionType: 'process-action',
            actionId: action.actionId,
            actionType: action.type
          });
          // Send error result back
          const errorResult = {
            type: 'action-result',
            actionId: action.actionId,
            result: { success: false, error: error.message }
          };
          
          // Try WebSocket first, fall back to HTTP
          const sendWebSocket = await getSendWebSocket();
          if (!sendWebSocket(errorResult)) {
            await fetch(`${syncUrl}/api/action-result`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(errorResult)
            });
          }
        }
      }
    } catch (error) {
      // Silently fail - Electron app might not be running
      // console.debug(`[${MODULE_ID}] Polling error (expected if Electron app not running):`, error.message);
    }
  }, pollingIntervalMs);
}

/**
 * Process actions from polling or WebSocket
 * @param {Array} actions - Array of actions to process
 * @param {string} syncUrl - Sync URL
 */
async function processActions(actions, syncUrl) {
  for (const action of actions) {
    try {
      // Rate limiting check
      const userId = action.userId || game.userId || 'unknown';
      if (checkRateLimit(userId)) {
        console.warn(`[${MODULE_ID}] Rate limit exceeded for user ${userId}`);
        // Send rate limit error back
        const errorResult = {
          actionId: action.actionId,
          result: { success: false, error: 'Rate limit exceeded. Please wait before trying again.' }
        };
        
        // Try WebSocket first, fall back to HTTP
        const sendWebSocket = await getSendWebSocket();
        if (!sendWebSocket({ type: 'action-result', ...errorResult })) {
          await fetch(`${syncUrl}/api/action-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorResult)
          });
        }
        continue; // Skip this action
      }
      
      // Process action (handled in startActionPolling above)
      // This function is kept for potential future use
    } catch (error) {
      handleSyncError(error, {
        actionType: 'process-action',
        actionId: action.actionId
      });
    }
  }
}

function stopActionPolling() {
  // Reset adaptive polling state
  currentPollingInterval = game.settings.get(MODULE_ID, 'pollingInterval') || 2000;
  consecutiveEmptyPolls = 0;
  consecutiveActivePolls = 0;
  pollingInterval = null;
}


/**
 * Auto-sync when server becomes available
 */
let serverCheckInterval = null;
let lastServerStatus = false;

function startServerAvailabilityCheck() {
  const serverCheckIntervalMs = game.settings.get(MODULE_ID, 'serverCheckInterval') || 5000;
  
  // Check immediately
  checkServerAvailability().then(async available => {
    if (available && !lastServerStatus) {
      console.log(`[${MODULE_ID}] Electron app server detected, syncing all characters...`);
      notifySyncStatus('5eMobile app connected', 'success');
      syncAllCharacters();
      
      // Process queued actions
      const processed = await processQueuedActions(sendActor);
      if (processed > 0) {
        notifySyncStatus(`Processed ${processed} queued actions`, 'success');
      }
    } else if (!available && lastServerStatus) {
      notifySyncStatus('5eMobile app disconnected', 'warning');
    }
    lastServerStatus = available;
  });

  // Check at configured interval
  serverCheckInterval = setInterval(async () => {
    const available = await checkServerAvailability();
    if (available && !lastServerStatus) {
      console.log(`[${MODULE_ID}] Electron app server detected, syncing all characters...`);
      notifySyncStatus('5eMobile app connected', 'success');
      syncAllCharacters();
      
      // Process queued actions
      const processed = await processQueuedActions(sendActor);
      if (processed > 0) {
        notifySyncStatus(`Processed ${processed} queued actions`, 'success');
      }
    } else if (!available && lastServerStatus) {
      notifySyncStatus('5eMobile app disconnected', 'warning');
    }
    lastServerStatus = available;
  }, serverCheckIntervalMs);
}

function stopServerAvailabilityCheck() {
  if (serverCheckInterval) {
    clearInterval(serverCheckInterval);
    serverCheckInterval = null;
  }
}

// Start sync on ready
Hooks.once('ready', () => {
  addSheetControls();
  startSync();
  startActionPolling(); // Task 3.1.3: Start polling for actions
  startServerAvailabilityCheck(); // Check for server and auto-sync
});

// Stop polling when module is unloaded
Hooks.on('closeApplication', () => {
  stopActionPolling();
  stopServerAvailabilityCheck();
});

