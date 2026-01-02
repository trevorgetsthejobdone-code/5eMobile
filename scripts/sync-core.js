/**
 * 5eMobile Sync Core Module
 * Core functions for syncing character data to Electron app
 */

import { handleSyncError } from './utils.js';

// Dynamic import for queue (to avoid circular dependency)
let queueActionFn = null;
async function getQueueAction() {
  if (!queueActionFn) {
    try {
      const queueModule = await import('./sync-queue.js');
      queueActionFn = queueModule.queueAction;
    } catch (error) {
      // Queue module not available
    }
  }
  return queueActionFn;
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
 * Convert actor to JSON format for transmission
 * @param {Actor} actor - Foundry actor object
 * @returns {Object} Serialized actor data
 */
export function actorToJSON(actor) {
  const system = {};
  
  // Copy all system properties
  Object.keys(actor.system || {}).forEach(key => {
    system[key] = actor.system[key];
  });

  return {
    id: actor.id,
    name: actor.name,
    type: actor.type,
    img: actor.img,
    system: system,
    items: actor.items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img,
      system: item.system
    })),
    effects: (actor.effects || []).map(effect => ({
      id: effect.id,
      name: effect.name,
      label: effect.label,
      icon: effect.icon
    }))
  };
}

/**
 * Get character owner information from Foundry actor
 * @param {Actor} actor - Foundry actor object
 * @returns {{id: string, name: string} | null} Owner information or null
 */
export function getCharacterOwner(actor) {
  if (!actor || !actor.ownership) {
    // If no ownership data, use the current user who enabled sync
    if (game.user && game.user.id) {
      return {
        id: game.user.id,
        name: game.user.name || 'Unknown User'
      };
    }
    return null;
  }

  // Check ownership Map for users with OWNER permission (level 3)
  const ownership = actor.ownership;
  if (ownership instanceof Map) {
    for (const [userId, permissionLevel] of ownership.entries()) {
      if (permissionLevel === 3) { // OWNER permission
        const user = game.users.get(userId);
        if (user) {
          return {
            id: user.id,
            name: user.name || 'Unknown User'
          };
        }
      }
    }
  } else if (typeof ownership === 'object') {
    // Handle object-based ownership (if not a Map)
    for (const [userId, permissionLevel] of Object.entries(ownership)) {
      if (permissionLevel === 3) { // OWNER permission
        const user = game.users.get(userId);
        if (user) {
          return {
            id: user.id,
            name: user.name || 'Unknown User'
          };
        }
      }
    }
  }

  // If no explicit owner found, use the current user who enabled sync
  if (game.user && game.user.id) {
    return {
      id: game.user.id,
      name: game.user.name || 'Unknown User'
    };
  }

  return null;
}

/**
 * Send actor data to Electron app
 * @param {Actor} actor - Foundry actor object
 * @param {string} action - Action type: 'update' or 'delete'
 */
export function sendActor(actor, action = 'update') {
  // Only sync characters
  if (actor.type !== 'character') {
    console.log(`[${MODULE_ID}] Skipping ${actor.name} - not a character`);
    return;
  }

  // Check if sync is enabled for this character
  if (!actor.getFlag(MODULE_ID, 'sync')) {
    console.log(`[${MODULE_ID}] Skipping ${actor.name} - sync not enabled`);
    if (action !== 'delete') {
      return;
    }
  }

  const actorObject = action === 'delete' ? null : actorToJSON(actor);
  const owner = getCharacterOwner(actor);
  const syncUrl = game.settings.get(MODULE_ID, 'syncUrl') || 'http://localhost:3000';

  fetch(`${syncUrl}/api/character/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      world_id: game.world.id,
      character_id: actor.id,
      action: action,
      data: actorObject,
      ownerId: owner ? owner.id : null,
      owner: owner
    })
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(jsonData => {
      if (jsonData.success) {
        console.log(`[${MODULE_ID}] Successfully synced ${actor.name}`);
        notifySyncStatus(`Synced ${actor.name} to 5eMobile`, 'success');
      } else {
        const errorMsg = jsonData.message || 'Unknown error';
        console.warn(`[${MODULE_ID}] Sync failed: ${errorMsg}`);
        notifySyncStatus(`Failed to sync ${actor.name}: ${errorMsg}`, 'warning');
      }
    })
    .catch(error => {
      handleSyncError(error, {
        characterName: actor.name,
        characterId: actor.id,
        actionType: 'sync-character',
        action: action
      });
      notifySyncStatus(`Error syncing ${actor.name}: ${error.message}`, 'error');
    });
}

/**
 * Send data to Electron app (generic function)
 * @param {Object} data - Data to send
 */
export function sendToElectronApp(data) {
  const syncUrl = game.settings.get(MODULE_ID, 'syncUrl') || 'http://localhost:3000';
  
  fetch(`${syncUrl}/api/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(jsonData => {
      if (!jsonData.success) {
        console.warn(`[${MODULE_ID}] Update failed: ${jsonData.message || 'Unknown error'}`);
      }
    })
    .catch(error => {
      // Silently fail - Electron app might not be running
      handleSyncError(error, {
        actionType: 'send-update',
        dataType: data.type || 'unknown'
      });
    });
}

/**
 * Check if Electron app server is available
 * @returns {Promise<boolean>} True if server is available
 */
export async function checkServerAvailability() {
  const syncUrl = game.settings.get(MODULE_ID, 'syncUrl') || 'http://localhost:3000';
  try {
    const response = await fetch(`${syncUrl}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Sync all characters that have sync enabled
 */
export function syncAllCharacters() {
  if (!game.actors) return;
  
  game.actors.contents.forEach(actor => {
    if (actor.type === 'character' && actor.getFlag(MODULE_ID, 'sync')) {
      sendActor(actor);
    }
  });
}

