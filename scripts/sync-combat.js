/**
 * 5eMobile Sync Combat & Chat Module
 * Handles combat state and chat message syncing
 */

import { handleSyncError } from './utils.js';
import { sendToElectronApp } from './sync-core.js';
import { validateActionData } from './sync-actions.js';

const MODULE_ID = '5eMobile';

/**
 * Send combat state to Electron app
 * @param {Combat|null} combat - Combat object or null if combat ended
 */
export function sendCombatState(combat) {
  if (!combat) {
    sendToElectronApp({
      type: 'combat-update',
      world_id: game.world.id,
      data: null
    });
    return;
  }
  
  const combatData = {
    id: combat.id,
    active: combat.started,
    round: combat.round || 0,
    turn: combat.turn || 0,
    combatants: combat.combatants.map(c => ({
      id: c.id,
      actorId: c.actor?.id || null,
      name: c.name || c.actor?.name || 'Unknown',
      initiative: c.initiative !== null ? c.initiative : null,
      isCurrent: c.id === combat.combatants[combat.turn]?.id,
      hidden: c.hidden || false
    }))
  };
  
  sendToElectronApp({
    type: 'combat-update',
    world_id: game.world.id,
    data: combatData
  });
}

/**
 * Send chat message to Electron app
 * @param {ChatMessage} message - Foundry chat message object
 */
export function sendChatMessage(message) {
  const messageData = {
    id: message.id,
    content: message.content,
    speaker: {
      actor: message.speaker?.actor || null,
      alias: message.speaker?.alias || message.user?.name || 'Unknown',
      scene: message.speaker?.scene || null
    },
    roll: message.roll ? {
      formula: message.roll.formula,
      total: message.roll.total,
      terms: message.roll.terms.map(t => t.toString())
    } : null,
    timestamp: message.timestamp,
    type: message.type,
    flags: message.flags || {},
    user: message.user?.name || 'Unknown'
  };
  
  sendToElectronApp({
    type: 'chat-message',
    world_id: game.world.id,
    data: messageData
  });
}

/**
 * Handle chat message from Electron app
 * @param {Object} action - Chat message action data
 * @returns {Promise<Object>} Result object
 */
export async function handleChatMessage(action) {
  try {
    // Validate action data
    const validation = validateActionData(action);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { characterId, content, type = 'text' } = action;
    const actor = game.actors.get(characterId);
    
    if (!content || typeof content !== 'string') {
      throw new Error('Message content is required and must be a string');
    }

    // Create chat message
    await ChatMessage.create({
      content: content,
      speaker: {
        actor: actor.id,
        alias: actor.name
      },
      type: type === 'roll' ? CONST.CHAT_MESSAGE_TYPES.ROLL : CONST.CHAT_MESSAGE_TYPES.OTHER
    });

    return { success: true };
  } catch (error) {
    const errorInfo = handleSyncError(error, {
      characterId: action.characterId,
      actionType: 'chat-message'
    });
    return {
      success: false,
      error: errorInfo.message
    };
  }
}

/**
 * Handle combat action from Electron app
 * @param {Object} action - Combat action data
 * @returns {Promise<Object>} Result object
 */
export async function handleCombatAction(action) {
  try {
    // Validate action data
    const validation = validateActionData(action);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { characterId, action: actionType, options = {} } = action;
    const combat = game.combat;
    
    if (!combat) {
      throw new Error('No active combat');
    }

    const actor = game.actors.get(characterId);
    
    if (!actionType) {
      throw new Error('Combat action type is required');
    }

    const combatant = combat.combatants.find(c => c.actor?.id === characterId);
    if (!combatant) {
      throw new Error('Character not in combat');
    }

    switch (actionType) {
      case 'roll-initiative':
        if (options.initiative !== undefined) {
          await combat.setInitiative(combatant.id, options.initiative);
        }
        break;
      case 'end-turn':
        if (combatant.id === combat.combatants[combat.turn]?.id) {
          await combat.nextTurn();
        } else {
          throw new Error('Not your turn');
        }
        break;
      default:
        throw new Error(`Unknown combat action: ${actionType}`);
    }

    // Sync combat state back
    sendCombatState(combat);

    return { success: true };
  } catch (error) {
    const errorInfo = handleSyncError(error, {
      characterId: action.characterId,
      actionType: 'combat-action',
      action: action.action
    });
    return {
      success: false,
      error: errorInfo.message
    };
  }
}

