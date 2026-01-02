/**
 * 5eMobile Sync Action Handlers
 * Handles action requests from Electron app (rolls, items, rests, etc.)
 */

import { handleSyncError } from './utils.js';
import { sendActor } from './sync-core.js';

const MODULE_ID = '5eMobile';

/**
 * Validate action data from Electron app
 * @param {Object} action - Action object to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateActionData(action) {
  if (!action || typeof action !== 'object') {
    return { valid: false, error: 'Invalid action data: action must be an object' };
  }

  // Validate characterId exists
  if (!action.characterId || typeof action.characterId !== 'string') {
    return { valid: false, error: 'Invalid action data: characterId is required and must be a string' };
  }

  const actor = game.actors.get(action.characterId);
  if (!actor) {
    return { valid: false, error: `Character not found: ${action.characterId}` };
  }

  // Validate user has permission
  if (!actor.isOwner && !game.user.isGM) {
    return { valid: false, error: 'No permission to perform actions for this character' };
  }

  // Validate action type
  const validActionTypes = [
    'roll', 'item-action', 'rest', 'character-update', 'chat-message',
    'combat-action', 'character-creation', 'compendium-request', 'level-up',
    'add-item', 'update-character-data'
  ];
  
  if (action.type && !validActionTypes.includes(action.type)) {
    return { valid: false, error: `Invalid action type: ${action.type}` };
  }

  // Validate itemId if provided
  if (action.itemId) {
    if (typeof action.itemId !== 'string') {
      return { valid: false, error: 'Invalid action data: itemId must be a string' };
    }
    const item = actor.items.get(action.itemId);
    if (!item) {
      return { valid: false, error: `Item not found: ${action.itemId}` };
    }
  }

  return { valid: true };
}

/**
 * Handle roll request from Electron app
 * @param {Object} action - Roll action data
 * @returns {Promise<Object>} Result object
 */
export async function handleRollRequest(action) {
  try {
    // Validate action data
    const validation = validateActionData(action);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { characterId, rollType, rollResult, options = {} } = action;
    const actor = game.actors.get(characterId);

    // Use roll result from Electron app (already calculated)
    // Create a Foundry Roll object for display in chat
    let roll = null;
    let chatMessage = null;

    if (rollResult) {
      // Create roll from result
      const formula = rollResult.breakdown || `1d20+${rollResult.modifier || 0}`;
      roll = new Roll(formula);
      roll._total = rollResult.total; // Set the total
      
      // Send to chat
      chatMessage = await ChatMessage.create({
        user: game.user.id,
        speaker: { actor: actor.id },
        content: `<div class="dnd5e chat-card">
          <header class="card-header flexrow">
            <h3>${rollType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
          </header>
          <div class="card-content">
            <div class="dice-roll">
              <div class="dice-result">
                <div class="dice-formula">${rollResult.breakdown || formula}</div>
                <h4 class="dice-total">${rollResult.total}</h4>
              </div>
            </div>
          </div>
        </div>`,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });
    }

    return {
      success: true,
      result: rollResult?.total || 0,
      breakdown: rollResult?.breakdown || '',
      chatMessage: chatMessage?.id || null
    };
  } catch (error) {
    const errorInfo = handleSyncError(error, {
      characterId: action.characterId,
      actionType: 'roll-request',
      rollType: action.rollType
    });
    return {
      success: false,
      error: errorInfo.message
    };
  }
}

/**
 * Handle item action request from Electron app
 * @param {Object} action - Item action data
 * @returns {Promise<Object>} Result object
 */
export async function handleItemAction(action) {
  try {
    // Validate action data
    const validation = validateActionData(action);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { characterId, itemId, action: actionType, options = {} } = action;
    const actor = game.actors.get(characterId);
    
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    const item = actor.items.get(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    switch (actionType) {
      case 'use':
        if (typeof item.use === 'function') {
          await item.use();
        } else {
          // Fallback: manually consume charges/uses
          const uses = item.system?.uses || {};
          if (uses.value > 0) {
            await item.update({ 'system.uses.value': uses.value - 1 });
          }
        }
        break;
      case 'equip':
        await item.update({ 'system.equipped': true });
        break;
      case 'unequip':
        await item.update({ 'system.equipped': false });
        break;
      case 'attune':
        await item.update({ 'system.attunement': 1 });
        break;
      case 'unattune':
        await item.update({ 'system.attunement': 0 });
        break;
      default:
        throw new Error(`Unknown action: ${actionType}`);
    }

    // Sync character back to Electron app
    sendActor(actor);

    return { success: true };
  } catch (error) {
    const errorInfo = handleSyncError(error, {
      characterId: action.characterId,
      itemId: action.itemId,
      actionType: 'item-action',
      action: action.action
    });
    return {
      success: false,
      error: errorInfo.message
    };
  }
}

/**
 * Handle rest request from Electron app
 * @param {Object} action - Rest action data
 * @returns {Promise<Object>} Result object
 */
export async function handleRestRequest(action) {
  try {
    // Validate action data
    const validation = validateActionData(action);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { characterId, restType } = action;
    const actor = game.actors.get(characterId);
    
    if (!restType || (restType !== 'short' && restType !== 'long')) {
      throw new Error('Invalid rest type: must be "short" or "long"');
    }

    if (restType === 'short') {
      // Restore hit dice (spend to heal)
      // Restore short rest resources
      const hd = actor.system?.attributes?.hd || {};
      if (hd.value < hd.max) {
        await actor.update({ 'system.attributes.hd.value': Math.min(hd.value + 1, hd.max) });
      }
      
      // Restore short rest resources
      const resources = actor.system?.resources || {};
      Object.keys(resources).forEach(key => {
        const resource = resources[key];
        if (resource.sr && resource.value < resource.max) {
          actor.update({ [`system.resources.${key}.value`]: resource.max });
        }
      });
    } else if (restType === 'long') {
      // Full rest: restore HP, hit dice, resources, spell slots, reduce exhaustion
      const hp = actor.system?.attributes?.hp || {};
      await actor.update({
        'system.attributes.hp.value': hp.max || hp.value,
        'system.attributes.hd.value': actor.system?.attributes?.hd?.max || 0,
        'system.attributes.exhaustion': Math.max(0, (actor.system?.attributes?.exhaustion || 0) - 1)
      });

      // Restore all resources
      const resources = actor.system?.resources || {};
      Object.keys(resources).forEach(key => {
        const resource = resources[key];
        if (resource.max > 0) {
          actor.update({ [`system.resources.${key}.value`]: resource.max });
        }
      });

      // Restore spell slots (would need to iterate through spell levels)
      // This is simplified - full implementation would restore all spell slots
    }

    // Sync character back to Electron app
    sendActor(actor);

    return { success: true };
  } catch (error) {
    const errorInfo = handleSyncError(error, {
      characterId: action.characterId,
      actionType: 'rest-request',
      restType: action.restType
    });
    return {
      success: false,
      error: errorInfo.message
    };
  }
}

/**
 * Handle character update request from Electron app
 * @param {Object} action - Character update action data
 * @returns {Promise<Object>} Result object
 */
export async function handleCharacterUpdate(action) {
  try {
    // Validate action data
    const validation = validateActionData(action);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { characterId, updates } = action;
    const actor = game.actors.get(characterId);
    
    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates object is required');
    }

    // Apply updates
    await actor.update(updates);

    // Sync character back to Electron app
    sendActor(actor);

    return { success: true };
  } catch (error) {
    const errorInfo = handleSyncError(error, {
      characterId: action.characterId,
      actionType: 'character-update'
    });
    return {
      success: false,
      error: errorInfo.message
    };
  }
}

/**
 * Handle character creation
 * @param {Object} characterData - Character data to create
 * @returns {Promise<Object>} Result object
 */
export async function handleCharacterCreation(characterData) {
  try {
    // Enhanced permission checks
    if (!game.user) {
      throw new Error('User not authenticated');
    }
    
    if (!game.user.isGM && !game.user.hasRole('ASSISTANT')) {
      throw new Error('No permission to create characters. Only GMs and Assistants can create characters.');
    }
    
    // Validate character data
    if (!characterData || typeof characterData !== 'object') {
      throw new Error('Invalid character data provided');
    }

    // Create actor in Foundry
    const created = await Actor.createDocuments([characterData]);
    
    if (created && created.length > 0) {
      const actor = created[0];
      
      // Enable sync for new character
      await actor.setFlag(MODULE_ID, 'sync', true);
      
      // Sync character to Electron app
      sendActor(actor);
      
      return {
        success: true,
        actorId: actor.id
      };
    } else {
      throw new Error('Failed to create character');
    }
  } catch (error) {
    const errorInfo = handleSyncError(error, {
      actionType: 'character-creation'
    });
    return {
      success: false,
      error: errorInfo.message
    };
  }
}

/**
 * Get default compendium data when compendium is not available
 * @param {string} type - Data type
 * @returns {Array} Empty array
 */
function getDefaultCompendiumData(type) {
  // These would normally come from compendium
  // For now, return empty array - the wizard will use its own defaults
  return [];
}

/**
 * Handle compendium requests
 * @param {Object} requestData - Compendium request data
 * @returns {Promise<Object>} Result object
 */
export async function handleCompendiumRequest(requestData) {
  try {
    const { type, pack } = requestData;
    
    // Get compendium pack
    const compendiumPack = game.packs.get(pack);
    if (!compendiumPack) {
      // Return default data if compendium not available
      return {
        success: true,
        data: getDefaultCompendiumData(type)
      };
    }

    // Load compendium content
    await compendiumPack.getIndex();
    const documents = compendiumPack.index.map(entry => ({
      id: entry._id,
      name: entry.name,
      type: entry.type
    }));

    // For detailed data, load specific documents
    let detailedData = documents;
    if (requestData.detailed) {
      const loaded = await compendiumPack.getDocuments();
      detailedData = loaded.map(doc => ({
        id: doc.id,
        name: doc.name,
        description: doc.system?.description?.value || '',
        traits: doc.system?.traits || {},
        // Add other relevant fields based on type
      }));
    }

    return {
      success: true,
      data: detailedData
    };
  } catch (error) {
    handleSyncError(error, {
      actionType: 'compendium-request',
      pack: requestData.pack,
      type: requestData.type
    });
    // Return default data on error
    return {
      success: true,
      data: getDefaultCompendiumData(requestData.type)
    };
  }
}

/**
 * Handle level up
 * @param {Object} action - Level up action data
 * @returns {Promise<Object>} Result object
 */
export async function handleLevelUp(action) {
  try {
    // Validate action data
    const validation = validateActionData(action);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { characterId, updates, newFeatures, newSpells } = action;
    const actor = game.actors.get(characterId);
    
    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates object is required');
    }

    // Apply updates
    await actor.update(updates);

    // Add new features as items (if any)
    if (newFeatures && newFeatures.length > 0) {
      // Would create feature items here
    }

    // Add new spells (if any)
    if (newSpells && newSpells.length > 0) {
      await actor.createEmbeddedDocuments('Item', newSpells);
    }

    // Sync character back to Electron app
    sendActor(actor);

    return { success: true };
  } catch (error) {
    const errorInfo = handleSyncError(error, {
      characterId: action.characterId,
      actionType: 'level-up'
    });
    return {
      success: false,
      error: errorInfo.message
    };
  }
}

/**
 * Handle add item
 * @param {Object} action - Add item action data
 * @returns {Promise<Object>} Result object
 */
export async function handleAddItem(action) {
  try {
    // Validate action data
    const validation = validateActionData(action);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { characterId, itemId, itemData, type, source } = action;
    const actor = game.actors.get(characterId);
    
    if (!source || (source !== 'compendium' && !itemData)) {
      throw new Error('Either source="compendium" with itemId, or itemData must be provided');
    }

    let itemToAdd = null;

    if (source === 'compendium' && itemId) {
      // Get item from compendium
      const pack = game.packs.get(`dnd5e.${type}`);
      if (pack) {
        const item = await pack.getDocument(itemId);
        if (item) {
          itemToAdd = item.toObject();
        }
      }
      
      if (!itemToAdd) {
        throw new Error('Item not found in compendium');
      }
    } else if (itemData) {
      // Custom item data
      itemToAdd = itemData;
    } else {
      throw new Error('No item data provided');
    }

    // Add item to actor
    await actor.createEmbeddedDocuments('Item', [itemToAdd]);

    // Sync character back
    sendActor(actor);

    return { success: true };
  } catch (error) {
    const errorInfo = handleSyncError(error, {
      characterId: action.characterId,
      itemId: action.itemId,
      actionType: 'add-item'
    });
    return {
      success: false,
      error: errorInfo.message
    };
  }
}

/**
 * Handle character data update
 * @param {Object} action - Character data update action
 * @returns {Promise<Object>} Result object
 */
export async function handleCharacterDataUpdate(action) {
  try {
    // Validate action data
    const validation = validateActionData(action);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { characterId, updates } = action;
    const actor = game.actors.get(characterId);
    
    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates object is required');
    }

    // Handle item updates/deletions
    if (updates.items && Array.isArray(updates.items)) {
      const itemsToDelete = [];
      const itemsToUpdate = [];
      
      for (const itemUpdate of updates.items) {
        if (itemUpdate._id) {
          const item = actor.items.get(itemUpdate._id);
          if (!item) continue;
          
          // Check if item should be deleted (quantity -1 or 0)
          if (itemUpdate['system.quantity'] === -1 || 
              (itemUpdate['system.quantity'] === 0 && (item.system?.quantity || 1) <= 1)) {
            itemsToDelete.push(itemUpdate._id);
          } else {
            itemsToUpdate.push(itemUpdate);
          }
        }
      }
      
      // Delete items first
      if (itemsToDelete.length > 0) {
        await actor.deleteEmbeddedDocuments('Item', itemsToDelete);
      }
      
      // Update remaining items
      if (itemsToUpdate.length > 0) {
        const updateData = { items: itemsToUpdate };
        await actor.update(updateData);
      }
    } else {
      // Apply other updates normally
      await actor.update(updates);
    }

    // Sync character back
    sendActor(actor);

    return { success: true };
  } catch (error) {
    const errorInfo = handleSyncError(error, {
      characterId: action.characterId,
      actionType: 'update-character-data'
    });
    return {
      success: false,
      error: errorInfo.message
    };
  }
}

/**
 * Action handler map for routing actions
 */
export const actionHandlers = {
  'roll': handleRollRequest,
  'item-action': handleItemAction,
  'rest': handleRestRequest,
  'character-update': handleCharacterUpdate,
  'character-creation': handleCharacterCreation,
  'compendium-request': handleCompendiumRequest,
  'level-up': handleLevelUp,
  'add-item': handleAddItem,
  'update-character-data': handleCharacterDataUpdate
};

