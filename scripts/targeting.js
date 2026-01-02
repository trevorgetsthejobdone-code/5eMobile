/**
 * Targeting System for 5eMobile
 * Handles target selection, range calculation, line of sight, and hit/miss determination
 * @module targeting
 */

const MODULE_ID = '5eMobile';

/**
 * Get the active token for an actor
 * @param {Actor} actor - The actor
 * @returns {Token|null} The token or null if not on canvas
 */
export function getActorToken(actor) {
  if (!actor || !canvas?.ready) return null;
  
  const tokens = canvas.tokens.placeables.filter(t => t.actor?.id === actor.id);
  return tokens.length > 0 ? tokens[0] : null;
}

/**
 * Parse range string to feet
 * Handles formats like "30 ft", "30", "60 feet", "Self", "Touch", etc.
 * @param {string} rangeStr - Range string from spell/weapon
 * @returns {number|null} Range in feet, or null if invalid/self/touch
 */
export function parseRange(rangeStr) {
  if (!rangeStr || typeof rangeStr !== 'string') return null;
  
  const lower = rangeStr.toLowerCase().trim();
  
  // Special cases
  if (lower === 'self' || lower === 'touch') return null; // No range limit for touch
  
  // Extract number from string (handles "30 ft", "60 feet", "30", etc.)
  const match = lower.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

/**
 * Calculate distance between two tokens in feet
 * Uses Foundry's measurement system (hex/square distance)
 * @param {Token} token1 - First token
 * @param {Token} token2 - Second token
 * @returns {number} Distance in feet
 */
export function calculateDistance(token1, token2) {
  if (!token1 || !token2 || !canvas?.grid) return Infinity;
  
  // Get grid size in feet
  const gridSize = canvas.grid.size;
  const gridDistance = canvas.grid.measureDistance(token1.center, token2.center);
  
  // Convert grid units to feet
  return gridDistance * gridSize;
}

/**
 * Check if line of sight exists between two tokens
 * Foundry automatically hides tokens that can't be seen, so we check visibility
 * @param {Token} sourceToken - Source token (attacker/caster)
 * @param {Token} targetToken - Target token
 * @returns {boolean} True if line of sight exists
 */
export function hasLineOfSight(sourceToken, targetToken) {
  if (!sourceToken || !targetToken || !canvas?.ready) return false;
  
  // If target is visible to the source token's controlled state, LOS exists
  // Foundry's visibility system handles this automatically
  // We check if the token is visible on the canvas from the source's perspective
  if (!targetToken.visible) return false;
  
  // Additional check: use Foundry's sight system if available
  if (canvas.sight?.checkVisibility) {
    const sourcePoint = sourceToken.center;
    const targetPoint = targetToken.center;
    
    // Check if there's a clear path (simplified - Foundry handles most of this)
    // For more accurate LOS, we'd need to check walls, but Foundry's visibility
    // system already accounts for this
    return true; // If visible, assume LOS (Foundry handles the rest)
  }
  
  return targetToken.visible;
}

/**
 * Get all valid targets within range
 * @param {Actor} attacker - The attacking/casting actor
 * @param {number|null} range - Range in feet (null = unlimited/touch)
 * @param {Object} options - Additional options
 * @param {boolean} options.includeAllies - Include friendly targets (default: false)
 * @param {boolean} options.includeSelf - Include self as target (default: false)
 * @returns {Array} Array of target objects with {token, actor, distance, ac, name}
 */
export function getValidTargets(attacker, range, options = {}) {
  const {
    includeAllies = false,
    includeSelf = false
  } = options;
  
  if (!attacker || !canvas?.ready) return [];
  
  const sourceToken = getActorToken(attacker);
  if (!sourceToken) return [];
  
  const targets = [];
  const sourceActor = attacker;
  
  // Get all tokens on the canvas
  const allTokens = canvas.tokens.placeables.filter(t => {
    if (!t.actor) return false;
    if (!t.visible) return false; // Only visible tokens (Foundry handles LOS)
    
    // Check if we should include this token
    if (!includeSelf && t.actor.id === sourceActor.id) return false;
    
    // Check alignment (allies vs enemies)
    if (!includeAllies) {
      // Check if target is an enemy (different actor, or hostile)
      // For simplicity, we'll include all non-self actors
      // GM can control this via Foundry's token disposition
      if (t.actor.id === sourceActor.id) return false;
      
      // Check token disposition (0 = unknown, 1 = neutral, 2 = friendly, 3 = hostile)
      // We'll include neutral and hostile by default
      const disposition = t.document.disposition;
      if (disposition === 2 && !includeAllies) return false; // Skip friendly
    }
    
    return true;
  });
  
  // Filter by range and LOS
  for (const token of allTokens) {
    const distance = calculateDistance(sourceToken, token);
    
    // Check range
    if (range !== null && distance > range) continue;
    
    // Check line of sight
    if (!hasLineOfSight(sourceToken, token)) continue;
    
    // Get AC from actor
    const actor = token.actor;
    const ac = actor?.system?.attributes?.ac?.value || 10;
    
    targets.push({
      tokenId: token.id,
      actorId: actor.id,
      name: actor.name || token.name,
      distance: Math.round(distance),
      ac: ac,
      token: token,
      actor: actor
    });
  }
  
  // Sort by distance (closest first)
  targets.sort((a, b) => a.distance - b.distance);
  
  return targets;
}

/**
 * Calculate if an attack hits
 * @param {number} attackRoll - The attack roll result
 * @param {number} targetAC - The target's AC
 * @param {Object} options - Additional options
 * @param {boolean} options.advantage - Has advantage
 * @param {boolean} options.disadvantage - Has disadvantage
 * @returns {Object} {hit: boolean, critical: boolean, margin: number}
 */
export function calculateHit(attackRoll, targetAC, options = {}) {
  const { advantage = false, disadvantage = false } = options;
  
  // Critical hit on natural 20
  const isCritical = attackRoll === 20;
  
  // Hit if roll >= AC (or critical)
  const hit = isCritical || attackRoll >= targetAC;
  
  // Calculate margin (how much over/under AC)
  const margin = attackRoll - targetAC;
  
  return {
    hit: hit,
    critical: isCritical,
    margin: margin,
    attackRoll: attackRoll,
    targetAC: targetAC
  };
}

/**
 * Apply damage to a target actor
 * @param {Actor} targetActor - The target actor
 * @param {number} damage - Damage amount
 * @param {Object} options - Additional options
 * @param {string} options.damageType - Type of damage (for resistances)
 * @param {boolean} options.healing - If true, heal instead of damage
 * @returns {Promise<Object>} Result object with success status and new HP
 */
export async function applyDamage(targetActor, damage, options = {}) {
  const { damageType = null, healing = false } = options;
  
  if (!targetActor) {
    throw new Error('Target actor is required');
  }
  
  const currentHP = targetActor.system.attributes.hp.value || 0;
  const maxHP = targetActor.system.attributes.hp.max || 0;
  
  let newHP;
  if (healing) {
    newHP = Math.min(maxHP, currentHP + damage);
  } else {
    // TODO: Apply resistances/vulnerabilities based on damageType
    // For now, just apply raw damage
    newHP = Math.max(0, currentHP - damage);
  }
  
  // Update actor HP
  await targetActor.update({
    'system.attributes.hp.value': newHP
  });
  
  return {
    success: true,
    previousHP: currentHP,
    newHP: newHP,
    damage: healing ? -damage : damage,
    isDead: newHP <= 0
  };
}

/**
 * Get AOE targets for a spell
 * @param {Actor} caster - The casting actor
 * @param {Token} centerToken - Center token for AOE (or caster's token)
 * @param {string} aoeType - Type of AOE: 'radius', 'line', 'cone', 'cube', 'sphere'
 * @param {number} aoeSize - Size of AOE in feet
 * @param {Object} options - Additional options
 * @returns {Array} Array of target objects
 */
export function getAOETargets(caster, centerToken, aoeType, aoeSize, options = {}) {
  const {
    includeAllies = false,
    includeSelf = false
  } = options;
  
  if (!caster || !canvas?.ready) return [];
  
  const sourceToken = centerToken || getActorToken(caster);
  if (!sourceToken) return [];
  
  const targets = [];
  const allTokens = canvas.tokens.placeables.filter(t => {
    if (!t.actor) return false;
    if (!t.visible) return false;
    if (!includeSelf && t.actor.id === caster.id) return false;
    if (!includeAllies && t.document.disposition === 2) return false;
    return true;
  });
  
  for (const token of allTokens) {
    const distance = calculateDistance(sourceToken, token);
    let inRange = false;
    
    // Check if token is within AOE based on type
    switch (aoeType.toLowerCase()) {
      case 'radius':
      case 'sphere':
        inRange = distance <= aoeSize;
        break;
      case 'line':
        // Line: check if token is in line from source
        // Simplified: check distance and angle
        inRange = distance <= aoeSize;
        // TODO: Add angle checking for proper line AOE
        break;
      case 'cone':
        // Cone: check distance and angle (typically 60-degree cone)
        inRange = distance <= aoeSize;
        // TODO: Add angle checking for proper cone AOE
        break;
      case 'cube':
        // Cube: check if within cube dimensions
        inRange = distance <= aoeSize;
        // TODO: Add proper cube shape checking
        break;
      default:
        inRange = distance <= aoeSize;
    }
    
    if (inRange && hasLineOfSight(sourceToken, token)) {
      const actor = token.actor;
      const ac = actor?.system?.attributes?.ac?.value || 10;
      
      targets.push({
        tokenId: token.id,
        actorId: actor.id,
        name: actor.name || token.name,
        distance: Math.round(distance),
        ac: ac,
        token: token,
        actor: actor
      });
    }
  }
  
  return targets;
}

/**
 * Calculate saving throw result
 * @param {Actor} targetActor - The target actor
 * @param {string} ability - Ability for saving throw (str, dex, con, int, wis, cha)
 * @param {number} dc - Difficulty class
 * @param {Object} options - Additional options
 * @returns {Object} {success: boolean, roll: number, modifier: number, dc: number}
 */
export async function calculateSavingThrow(targetActor, ability, dc, options = {}) {
  if (!targetActor) {
    throw new Error('Target actor is required');
  }
  
  const abilityScore = targetActor.system.abilities[ability]?.value || 10;
  const abilityMod = Math.floor((abilityScore - 10) / 2);
  const proficient = targetActor.system.abilities[ability]?.proficient || false;
  const level = targetActor.system.details.level || 1;
  const pb = Math.ceil(1 + (level / 4));
  
  const modifier = abilityMod + (proficient ? pb : 0);
  
  // Roll d20
  const roll = new Roll('1d20');
  await roll.roll();
  const rollTotal = roll.total + modifier;
  
  const success = rollTotal >= dc;
  
  return {
    success: success,
    roll: roll.total, // Natural roll
    rollTotal: rollTotal, // Roll + modifier
    modifier: modifier,
    dc: dc,
    ability: ability
  };
}

