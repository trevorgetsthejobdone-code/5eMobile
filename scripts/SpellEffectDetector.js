/**
 * Spell Effect Detector
 * Detects and tracks spell effects that modify character statistics
 * 
 * @module SpellEffectDetector
 */

const MODULE_ID = '5eMobile';

/**
 * Base class for detecting spell effects on character statistics
 */
export class SpellEffectDetector {
  constructor() {
    this.spellCategories = null;
    this.spellInventory = null;
    this.loaded = false;
  }

  /**
   * Load spell data from JSON files
   * @returns {Promise<void>}
   */
  async loadSpellData() {
    if (this.loaded) return;

    try {
      // Load spell categories
      const categoriesResponse = await fetch('modules/5eMobile/data/spell-categories.json');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        this.spellCategories = categoriesData.categories || {};
      }

      // Load spell inventory
      const inventoryResponse = await fetch('modules/5eMobile/data/spell-inventory.json');
      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        this.spellInventory = inventoryData.spells || {};
      }

      this.loaded = true;
    } catch (error) {
      console.error(`[${MODULE_ID}] Error loading spell data:`, error);
    }
  }

  /**
   * Get active effects for an actor
   * @param {Actor5e} actor - The actor
   * @returns {Array} Array of active effects
   */
  getActiveEffects(actor) {
    if (!actor.effects) return [];
    return actor.effects.filter(effect => effect.isActive);
  }

  /**
   * Match effect to spell by name or UUID
   * @param {ActiveEffect} effect - The effect
   * @returns {Object|null} Spell data or null
   */
  matchEffectToSpell(effect) {
    if (!this.spellInventory || !effect) return null;

    // Try to match by UUID first
    if (effect.origin && this.spellInventory[effect.origin]) {
      return this.spellInventory[effect.origin];
    }

    // Try to match by name
    const effectName = effect.name || effect.label || '';
    for (const [spellId, spellData] of Object.entries(this.spellInventory)) {
      if (spellData.name && spellData.name.toLowerCase() === effectName.toLowerCase()) {
        return spellData;
      }
    }

    return null;
  }

  /**
   * Detect ability score modifiers from active effects
   * @param {Actor5e} actor - The actor
   * @returns {Object} Object with ability scores and their modifiers
   */
  detectAbilityScoreModifiers(actor) {
    const modifiers = {
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0
    };

    const activeEffects = this.getActiveEffects(actor);
    
    for (const effect of activeEffects) {
      const spell = this.matchEffectToSpell(effect);
      if (!spell) continue;

      // Check spell categories for ability score effects
      const abilityCategory = this.spellCategories?.abilityScores;
      if (abilityCategory) {
        const spellData = abilityCategory.spells.find(s => s.id === spell.id || s.name === spell.name);
        if (spellData && spellData.effects) {
          for (const effectData of spellData.effects) {
            if (effectData.type === 'ability_bonus') {
              const ability = effectData.ability?.toLowerCase();
              if (ability && modifiers.hasOwnProperty(ability)) {
                modifiers[ability] += effectData.value || 0;
              }
            }
          }
        }
      }

      // Also check effect changes directly
      if (effect.changes) {
        for (const change of effect.changes) {
          if (change.key && change.key.includes('abilities.')) {
            const abilityMatch = change.key.match(/abilities\.(\w+)\.value/);
            if (abilityMatch) {
              const ability = abilityMatch[1].toLowerCase();
              if (modifiers.hasOwnProperty(ability)) {
                const value = parseFloat(change.value) || 0;
                modifiers[ability] += value;
              }
            }
          }
        }
      }
    }

    return modifiers;
  }

  /**
   * Detect AC modifiers from active effects
   * @param {Actor5e} actor - The actor
   * @returns {number} AC modifier
   */
  detectACModifier(actor) {
    let modifier = 0;

    const activeEffects = this.getActiveEffects(actor);
    
    for (const effect of activeEffects) {
      const spell = this.matchEffectToSpell(effect);
      if (!spell) continue;

      // Check spell categories for AC effects
      const acCategory = this.spellCategories?.ac;
      if (acCategory) {
        const spellData = acCategory.spells.find(s => s.id === spell.id || s.name === spell.name);
        if (spellData && spellData.effects) {
          for (const effectData of spellData.effects) {
            if (effectData.type === 'ac_bonus') {
              modifier += effectData.value || 0;
            }
          }
        }
      }

      // Check effect changes directly
      if (effect.changes) {
        for (const change of effect.changes) {
          if (change.key && change.key.includes('attributes.ac.value')) {
            const value = parseFloat(change.value) || 0;
            modifier += value;
          }
        }
      }
    }

    return modifier;
  }

  /**
   * Detect speed modifiers from active effects
   * @param {Actor5e} actor - The actor
   * @returns {Object} Speed modifier information
   */
  detectSpeedModifier(actor) {
    let multiplier = 1;
    let flatBonus = 0;

    const activeEffects = this.getActiveEffects(actor);
    
    for (const effect of activeEffects) {
      const spell = this.matchEffectToSpell(effect);
      if (!spell) continue;

      // Check spell categories for speed effects
      const speedCategory = this.spellCategories?.speed;
      if (speedCategory) {
        const spellData = speedCategory.spells.find(s => s.id === spell.id || s.name === spell.name);
        if (spellData && spellData.effects) {
          for (const effectData of spellData.effects) {
            if (effectData.type === 'speed_multiplier') {
              multiplier *= effectData.value || 1;
            } else if (effectData.type === 'speed_bonus') {
              flatBonus += effectData.value || 0;
            }
          }
        }
      }

      // Check effect changes directly
      if (effect.changes) {
        for (const change of effect.changes) {
          if (change.key && change.key.includes('attributes.movement')) {
            const value = parseFloat(change.value) || 0;
            if (change.mode === 5) { // Multiply
              multiplier *= value;
            } else {
              flatBonus += value;
            }
          }
        }
      }
    }

    return { multiplier, flatBonus };
  }

  /**
   * Detect HP modifiers from active effects
   * @param {Actor5e} actor - The actor
   * @returns {number} HP modifier
   */
  detectHPModifier(actor) {
    let modifier = 0;

    const activeEffects = this.getActiveEffects(actor);
    
    for (const effect of activeEffects) {
      const spell = this.matchEffectToSpell(effect);
      if (!spell) continue;

      // Check spell categories for HP effects
      const hpCategory = this.spellCategories?.hp;
      if (hpCategory) {
        const spellData = hpCategory.spells.find(s => s.id === spell.id || s.name === spell.name);
        if (spellData && spellData.effects) {
          for (const effectData of spellData.effects) {
            if (effectData.type === 'hp_bonus' || effectData.type === 'hp_max_bonus') {
              modifier += effectData.value || 0;
            }
          }
        }
      }

      // Check effect changes directly
      if (effect.changes) {
        for (const change of effect.changes) {
          if (change.key && (change.key.includes('attributes.hp.max') || change.key.includes('attributes.hp.value'))) {
            const value = parseFloat(change.value) || 0;
            modifier += value;
          }
        }
      }
    }

    return modifier;
  }

  /**
   * Detect saving throw modifiers from active effects
   * @param {Actor5e} actor - The actor
   * @returns {Object} Object with saving throw modifiers per ability
   */
  detectSavingThrowModifiers(actor) {
    const modifiers = {
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0
    };

    const activeEffects = this.getActiveEffects(actor);
    
    for (const effect of activeEffects) {
      const spell = this.matchEffectToSpell(effect);
      if (!spell) continue;

      // Check spell categories for saving throw effects
      const savesCategory = this.spellCategories?.savingThrows;
      if (savesCategory) {
        const spellData = savesCategory.spells.find(s => s.id === spell.id || s.name === spell.name);
        if (spellData && spellData.effects) {
          for (const effectData of spellData.effects) {
            if (effectData.type === 'save_bonus') {
              const ability = effectData.ability?.toLowerCase();
              if (ability && modifiers.hasOwnProperty(ability)) {
                modifiers[ability] += effectData.value || 0;
              }
            }
          }
        }
      }

      // Check effect changes directly
      if (effect.changes) {
        for (const change of effect.changes) {
          if (change.key && change.key.includes('abilities.') && change.key.includes('.save')) {
            const abilityMatch = change.key.match(/abilities\.(\w+)\.save/);
            if (abilityMatch) {
              const ability = abilityMatch[1].toLowerCase();
              if (modifiers.hasOwnProperty(ability)) {
                const value = parseFloat(change.value) || 0;
                modifiers[ability] += value;
              }
            }
          }
        }
      }
    }

    return modifiers;
  }

  /**
   * Get all detected effects for an actor
   * @param {Actor5e} actor - The actor
   * @returns {Object} Object containing all detected effect modifiers
   */
  async detectAllEffects(actor) {
    await this.loadSpellData();

    return {
      abilityScores: this.detectAbilityScoreModifiers(actor),
      ac: this.detectACModifier(actor),
      speed: this.detectSpeedModifier(actor),
      hp: this.detectHPModifier(actor),
      savingThrows: this.detectSavingThrowModifiers(actor)
    };
  }
}

// Singleton instance
let detectorInstance = null;

/**
 * Get the spell effect detector instance
 * @returns {SpellEffectDetector} Detector instance
 */
export function getSpellEffectDetector() {
  if (!detectorInstance) {
    detectorInstance = new SpellEffectDetector();
  }
  return detectorInstance;
}

