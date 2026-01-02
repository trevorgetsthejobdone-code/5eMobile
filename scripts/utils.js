/**
 * Utility functions for 5eMobile module
 * @module utils
 */

/**
 * Detect if the current device is mobile
 * @returns {boolean} True if device appears to be mobile
 */
export function isMobileDevice() {
  // Check user agent
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  const isMobileUA = mobileRegex.test(userAgent.toLowerCase());

  // Check viewport size (mobile typically < 768px width)
  const isMobileViewport = window.innerWidth < 768 || window.innerHeight < 600;

  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Consider mobile if any two conditions are true
  return (isMobileUA && isMobileViewport) || (isMobileViewport && hasTouch) || (isMobileUA && hasTouch);
}

/**
 * Format ability modifier
 * @param {number} score - Ability score
 * @returns {string} Formatted modifier (e.g., "+3", "-1")
 */
export function formatModifier(score) {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/**
 * Format proficiency bonus
 * @param {number} level - Character level
 * @returns {number} Proficiency bonus
 */
export function getProficiencyBonus(level) {
  return Math.ceil(1 + (level / 4));
}

/**
 * Get saving throw modifier
 * @param {Actor5e} actor - The actor
 * @param {string} ability - Ability key (str, dex, con, etc.)
 * @returns {string} Formatted saving throw modifier
 */
export function getSavingThrowModifier(actor, ability) {
  const abilityScore = actor.system.abilities[ability]?.value || 10;
  const abilityMod = Math.floor((abilityScore - 10) / 2);
  const proficient = actor.system.abilities[ability]?.proficient || false;
  const pb = getProficiencyBonus(actor.system.details.level || 1);
  
  const total = abilityMod + (proficient ? pb : 0);
  return total >= 0 ? `+${total}` : `${total}`;
}

/**
 * Get passive perception
 * @param {Actor5e} actor - The actor
 * @returns {number} Passive perception score
 */
export function getPassivePerception(actor) {
  const wis = actor.system.abilities.wis?.value || 10;
  const wisMod = Math.floor((wis - 10) / 2);
  const pb = getProficiencyBonus(actor.system.details.level || 1);
  const perceptionProf = actor.system.skills.prc?.proficient || false;
  
  return 10 + wisMod + (perceptionProf ? pb : 0);
}

/**
 * Get passive investigation
 * @param {Actor5e} actor - The actor
 * @returns {number} Passive investigation score
 */
export function getPassiveInvestigation(actor) {
  const int = actor.system.abilities.int?.value || 10;
  const intMod = Math.floor((int - 10) / 2);
  const pb = getProficiencyBonus(actor.system.details.level || 1);
  const investigationProf = actor.system.skills.inv?.proficient || false;
  
  return 10 + intMod + (investigationProf ? pb : 0);
}

/**
 * Get resistances from actor traits
 * @param {Actor5e} actor - The actor
 * @returns {string[]} Array of resistance names
 */
export function getResistances(actor) {
  const dr = actor.system.traits?.dr || {};
  const resistances = [];
  
  if (dr.value) {
    dr.value.forEach(res => {
      if (typeof res === 'string') {
        resistances.push(res);
      } else if (res.label) {
        resistances.push(res.label);
      }
    });
  }
  
  return resistances;
}

/**
 * Get active conditions from effects
 * @param {Actor5e} actor - The actor
 * @returns {string[]} Array of condition names
 */
export function getActiveConditions(actor) {
  const conditions = [];
  
  if (actor.effects) {
    actor.effects.forEach(effect => {
      if (effect.isActive && effect.name) {
        conditions.push(effect.name);
      }
    });
  }
  
  return conditions;
}

/**
 * Handle sync errors with context logging
 * @param {Error} error - The error object
 * @param {Object} context - Context information (character name, action type, etc.)
 * @returns {Object} Error object with context
 */
export function handleSyncError(error, context = {}) {
  const errorInfo = {
    message: error.message || 'Unknown error',
    stack: error.stack,
    context: {
      characterName: context.characterName || 'Unknown',
      actionType: context.actionType || 'Unknown',
      characterId: context.characterId || null,
      timestamp: new Date().toISOString(),
      ...context
    }
  };
  
  console.error(`[5eMobile] Sync Error:`, errorInfo);
  
  return errorInfo;
}

