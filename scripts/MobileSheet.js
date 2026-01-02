/**
 * Mobile Actor Sheet for D&D 5e
 * Extends dnd5e's CharacterActorSheet with mobile-optimized interface
 * 
 * @class MobileActorSheet5e
 * @extends {dnd5e.applications.actor.CharacterActorSheet}
 * @module 5eMobile
 */

import { formatModifier, getProficiencyBonus, getSavingThrowModifier, getPassivePerception, getPassiveInvestigation, getResistances, getActiveConditions } from './utils.js';

// Note: This assumes dnd5e.applications.actor.CharacterActorSheet is available
// It should be, since dnd5e is a system dependency and loads before modules
export class MobileActorSheet5e extends dnd5e.applications.actor.CharacterActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['dnd5e', 'sheet', 'actor', 'character', 'mobile-sheet'],
      width: '100%',
      height: '100%',
      resizable: false
    });
  }

  /** @override */
  static PARTS = {
    content: {
      template: 'modules/5eMobile/templates/sheet.hbs'
    }
  };

  /** @override */
  _configureRenderParts(options) {
    // Return our single content part instead of the default multi-part structure
    return {
      content: {
        template: 'modules/5eMobile/templates/sheet.hbs'
      }
    };
  }

  constructor(...args) {
    super(...args);
    
    // Internal state for split-pane navigation
    this.leftActiveTab = 'actions';
    this.rightActiveTab = 'bio';
    this.filters = {
      actionType: 'all',
      inventoryContainer: 'all',
      inventoryType: 'all'
    };
  }

  /** @override */
  async _prepareContext(options) {
    // Check cache first
    const actor = this.actor;
    const cacheKey = `${actor.id}-${actor.data.updateTime}`;
    
    if (this._renderCache.lastContext && 
        this._renderCache.lastContext._cacheKey === cacheKey &&
        Date.now() - this._renderCache.lastRenderTime < 100) {
      // Return cached context if actor hasn't changed and recent render
      return this._renderCache.lastContext;
    }
    
    // Get base context from parent class (which already has all the actor data)
    const context = await super._prepareContext(options);
    
    const system = actor.system;

    // Prepare header data
    context.header = this._prepareHeaderData(context, actor, system);
    
    // Prepare actions tab data
    context.actions = this._prepareActionsData(context, actor, system);
    
    // Prepare inventory tab data
    context.inventory = this._prepareInventoryData(context, actor, system);
    
    // Prepare bio tab data
    context.bio = this._prepareBioData(context, actor, system);
    
    // Prepare features tab data
    context.features = this._prepareFeaturesData(context, actor, system);
    
    // Add UI state
    context.leftActiveTab = this.leftActiveTab;
    context.rightActiveTab = this.rightActiveTab;
    context.filters = this.filters;
    
    // Store in cache
    context._cacheKey = cacheKey;
    this._renderCache.lastContext = context;
    this._renderCache.lastRenderTime = Date.now();

    return context;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    console.log('5eMobile: Sheet rendered', { 
      hasElement: !!this.element, 
      hasContent: !!this.element?.querySelector('.mobile-sheet-container'),
      elementHTML: this.element?.innerHTML?.substring(0, 200)
    });
    
    // Update sync status indicator
    this._updateSyncStatus();
  }

  /**
   * Update sync status indicator
   * Checks server availability and updates UI to show connection status
   * @private
   * @returns {Promise<void>}
   */
  async _updateSyncStatus() {
    const syncStatusEl = this.element?.find('#sync-status');
    const syncIconEl = this.element?.find('#sync-status-icon');
    
    if (!syncStatusEl || !syncIconEl) return;
    
    const actor = this.actor;
    const isSyncing = actor.getFlag('5eMobile', 'sync') || false;
    const syncUrl = game.settings.get('5eMobile', 'syncUrl') || 'http://localhost:3000';
    
    // Check server availability
    try {
      const response = await fetch(`${syncUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      const isConnected = response.ok;
      
      syncStatusEl.removeClass('sync-disconnected sync-syncing');
      syncIconEl.removeClass('fa-mobile-screen-button fa-spinner fa-spin');
      
      if (isSyncing) {
        if (isConnected) {
          syncStatusEl.addClass('sync-connected');
          syncIconEl.addClass('fa-mobile-screen-button');
          syncStatusEl.attr('title', '5eMobile: Connected and syncing');
        } else {
          syncStatusEl.addClass('sync-disconnected');
          syncIconEl.addClass('fa-mobile-screen-button');
          syncStatusEl.attr('title', '5eMobile: Disconnected (app not running)');
        }
      } else {
        syncStatusEl.addClass('sync-disabled');
        syncIconEl.addClass('fa-mobile-screen-button');
        syncStatusEl.attr('title', '5eMobile: Sync disabled for this character');
      }
    } catch (error) {
      syncStatusEl.removeClass('sync-connected sync-syncing');
      syncStatusEl.addClass('sync-disconnected');
      syncIconEl.removeClass('fa-spinner fa-spin');
      syncIconEl.addClass('fa-mobile-screen-button');
      syncStatusEl.attr('title', '5eMobile: Disconnected (app not running)');
    }
  }

  /**
   * Prepare header data for template rendering
   * @private
   * @param {Object} context - Template context
   * @param {Actor5e} actor - The actor
   * @param {Object} system - Actor system data
   * @returns {Object} Header data object
   */
  async _prepareHeaderData(context, actor, system) {
    const pb = getProficiencyBonus(system.details.level || 1);
    const hp = system.attributes.hp;
    const isBloodied = hp.value < (hp.max / 2);
    
    // Detect spell effects
    const detector = getSpellEffectDetector();
    const effects = await detector.detectAllEffects(actor);
    
    // Prepare saving throws with effect modifiers
    const saves = ['str', 'dex', 'con', 'int', 'wis', 'cha'].map(ability => {
      const baseMod = getSavingThrowModifier(actor, ability);
      const effectMod = effects.savingThrows[ability] || 0;
      const totalMod = parseFloat(baseMod.replace('+', '')) + effectMod;
      const modString = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
      
      return {
        label: ability.toUpperCase(),
        mod: modString,
        baseMod: baseMod,
        effectMod: effectMod !== 0 ? (effectMod >= 0 ? `+${effectMod}` : `${effectMod}`) : null,
        proficient: system.abilities[ability]?.proficient || false
      };
    });

    // Get resistances
    const resistances = getResistances(actor);

    // Get senses
    const senses = [];
    const passivePerception = getPassivePerception(actor);
    senses.push(`Passive Perc: ${passivePerception}`);
    
    const passiveInvestigation = getPassiveInvestigation(actor);
    senses.push(`Passive Inv: ${passiveInvestigation}`);
    
    // Add darkvision if present
    if (system.traits.senses?.darkvision) {
      senses.push(`Darkvision: ${system.traits.senses.darkvision}ft`);
    }

    // Get conditions
    const conditions = getActiveConditions(actor);

    // Get class string
    const classes = actor.items.filter(i => i.type === 'class');
    const classString = classes.length > 0 
      ? classes.map(c => `${c.name} ${c.system.levels || 1}`).join(' / ')
      : (system.details.class || 'No Class');

    // Calculate modified AC
    const baseAC = system.attributes.ac.value;
    const acModifier = effects.ac || 0;
    const modifiedAC = baseAC + acModifier;

    // Calculate modified HP
    const hpModifier = effects.hp || 0;
    const modifiedHP = {
      current: hp.value,
      max: hp.max + hpModifier,
      isBloodied: hp.value < ((hp.max + hpModifier) / 2)
    };

    // Calculate modified speed
    const baseSpeed = system.attributes.movement?.walk || 30;
    const speedEffects = effects.speed || { multiplier: 1, flatBonus: 0 };
    const modifiedSpeed = Math.floor(baseSpeed * speedEffects.multiplier) + speedEffects.flatBonus;

    return {
      name: actor.name,
      img: actor.img,
      level: system.details.level || 1,
      class: classString,
      gender: system.details.gender || '—',
      pb: `+${pb}`,
      saves: saves,
      ac: modifiedAC,
      acBase: baseAC,
      acModifier: acModifier !== 0 ? (acModifier >= 0 ? `+${acModifier}` : `${acModifier}`) : null,
      hp: modifiedHP,
      speed: modifiedSpeed,
      speedBase: baseSpeed,
      speedModifier: speedEffects.multiplier !== 1 || speedEffects.flatBonus !== 0 
        ? `${speedEffects.multiplier !== 1 ? `${speedEffects.multiplier}x` : ''}${speedEffects.flatBonus !== 0 ? (speedEffects.flatBonus >= 0 ? `+${speedEffects.flatBonus}` : `${speedEffects.flatBonus}`) : ''}`
        : null,
      init: formatModifier(system.abilities.dex?.value || 10),
      inspiration: system.attributes.inspiration || false,
      resistances: resistances,
      senses: senses,
      conditions: conditions,
      spellEffects: effects
    };
  }

  /**
   * Prepare actions tab data for template rendering
   * @private
   * @param {Object} context - Template context
   * @param {Actor5e} actor - The actor
   * @param {Object} system - Actor system data
   * @returns {Object} Actions data object with weapons, spells, and basic actions
   */
  _prepareActionsData(context, actor, system) {
    // Get equipped weapons
    const weapons = actor.items.filter(item => 
      item.type === 'weapon' && item.system.equipped
    ).map(weapon => {
      // Add labels for display
      return foundry.utils.mergeObject(weapon, {
        labels: weapon.labels || {}
      });

    });

    // Get spells grouped by level
    const spells = actor.items.filter(item => item.type === 'spell');
    const spellsByLevel = {};
    
    spells.forEach(spell => {
      const level = spell.system.level || 0;
      if (!spellsByLevel[level]) {
        spellsByLevel[level] = {
          level: level,
          label: level === 0 ? 'Cantrips' : `Level ${level} Spells`,
          slots: {
            current: system.spells[`spell${level}`]?.value || 0,
            max: system.spells[`spell${level}`]?.max || 0
          },
          spells: []
        };
      }
      spellsByLevel[level].spells.push(spell);
    });

    return {
      weapons: weapons,
      spellsByLevel: Object.values(spellsByLevel).sort((a, b) => a.level - b.level),
      basicActions: [
        'Dash', 'Disengage', 'Dodge', 'Grapple', 'Help', 'Hide',
        'Shove', 'Improvise', 'Ready', 'Search', 'Study', 'Utilize'
      ]
    };
  }

  /**
   * Prepare inventory tab data for template rendering
   * @private
   * @param {Object} context - Template context
   * @param {Actor5e} actor - The actor
   * @param {Object} system - Actor system data
   * @returns {Object} Inventory data object with items, containers, and attunement info
   */
  _prepareInventoryData(context, actor, system) {
    const items = actor.items.filter(item => item.type !== 'spell' && item.type !== 'class' && item.type !== 'subclass');
    
    // Get containers - normalize to match filter values
    const containers = ['All', 'Equipped', 'Backpack', 'Quiver'];
    
    // Get attuned items
    const attunedItems = items.filter(item => item.system.attunement === 2);
    
    // Get item types - normalize to match filter values
    const itemTypes = ['All', 'weapon', 'armor', 'equipment', 'consumable', 'wondrous'];

    // Normalize item container values for filtering
    const normalizedItems = items.map(item => {
      const container = item.system.container || 'Backpack';
      // Map container values to filter values
      let normalizedContainer = 'Backpack';
      if (item.system.equipped) {
        normalizedContainer = 'Equipped';
      } else if (containers.includes(container)) {
        normalizedContainer = container;
      }
      
      return foundry.utils.mergeObject(item, {
        _normalizedContainer: normalizedContainer
      });
    });

    return {
      items: normalizedItems,
      containers: containers,
      itemTypes: itemTypes,
      attunedItems: attunedItems,
      attunementSlots: {
        current: attunedItems.length,
        max: 3
      }
    };
  }

  /**
   * Prepare bio tab data
   */
  _prepareBioData(context, actor, system) {
    return {
      race: system.details.race || '—',
      gender: system.details.gender || '—',
      alignment: system.details.alignment || '—',
      background: system.details.background || '—',
      xp: system.details.xp?.value || 0,
      biography: actor.system.details.biography?.value || ''
    };
  }

  /**
   * Prepare features tab data
   */
  _prepareFeaturesData(context, actor, system) {
    const features = actor.items.filter(item => 
      item.type === 'feat' || item.type === 'feature'
    );

    return {
      features: features
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Tab switching
    html.find('.v-tab-btn').on('click', this._onTabSwitch.bind(this));
    
    // Filter pills
    html.find('.filter-pill').on('click', this._onFilterChange.bind(this));
    
    // Item interactions
    html.find('.item-name, .item-row').on('click', this._onItemClick.bind(this));
    html.find('.item-toggle').on('click', this._onToggleEquip.bind(this));
    html.find('.attune-btn').on('click', this._onAttuneItem.bind(this));
    html.find('.use-item-btn').on('click', this._onUseItem.bind(this));
    
    // Weapon/spell rolls
    html.find('.item-roll, .weapon-roll').on('click', this._onItemRoll.bind(this));
    
    // Spell casting
    html.find('.spell-cast').on('click', this._onCastSpell.bind(this));
    html.find('.spell-name, .spell-name-text').on('click', this._onSpellDetail.bind(this));
    
    // Rest system
    html.find('#rest-btn, .hp-display').on('click', this._onRest.bind(this));
    
    // Header interactions
    html.find('.header-popover-btn').on('click', this._onHeaderPopover.bind(this));
    html.find('.inspiration-toggle').on('click', this._onToggleInspiration.bind(this));
    html.find('#sync-log-btn').on('click', this._onSyncLogClick.bind(this));
    
    // Overlay close buttons
    html.find('.overlay-close').on('click', this._onCloseOverlay.bind(this));
    
    // Bio textarea changes
    html.find('.backstory-textarea').on('change', this._onBioChange.bind(this));
  }
  
  /**
   * Handle biography changes
   */
  async _onBioChange(event) {
    const value = event.target.value;
    const actor = this.actor;
    await actor.update({ 'system.details.biography.value': value });
  }

  /**
   * Handle tab switching
   */
  _onTabSwitch(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const panel = button.dataset.panel;
    const tab = button.dataset.tab;

    if (panel === 'left') {
      this.leftActiveTab = tab;
    } else if (panel === 'right') {
      this.rightActiveTab = tab;
    }

    // Close any open overlays
    this.element.find('.overlay').addClass('hidden');

    // Update UI
    this._updateTabButtons();
    this.render();
  }

  /**
   * Update tab button styling
   */
  _updateTabButtons() {
    const leftTabs = this.element.find('.v-tab-btn[data-panel="left"]');
    const rightTabs = this.element.find('.v-tab-btn[data-panel="right"]');

    leftTabs.each((i, btn) => {
      const $btn = $(btn);
      if ($btn.data('tab') === this.leftActiveTab) {
        $btn.addClass('active');
      } else {
        $btn.removeClass('active');
      }
    });

    rightTabs.each((i, btn) => {
      const $btn = $(btn);
      if ($btn.data('tab') === this.rightActiveTab) {
        $btn.addClass('active');
      } else {
        $btn.removeClass('active');
      }
    });
  }

  /**
   * Handle filter changes
   */
  _onFilterChange(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const filterType = button.dataset.filterType;
    const filterValue = button.dataset.filterValue;

    if (filterType === 'action') {
      this.filters.actionType = filterValue.toLowerCase();
    } else if (filterType === 'container') {
      this.filters.inventoryContainer = filterValue;
    } else if (filterType === 'itemType') {
      this.filters.inventoryType = filterValue.toLowerCase();
    }

    // Update active state on buttons
    this.element.find('.filter-pill').removeClass('active');
    button.classList.add('active');

    this.render();
  }

  /**
   * Handle item clicks (show overlay)
   */
  _onItemClick(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const actor = this.actor;
    const item = actor.items.get(itemId);
    if (!item) return;

    this._showItemOverlay(item, event.currentTarget.closest('.panel').dataset.panel);
  }

  /**
   * Show item detail overlay
   */
  _showItemOverlay(item, panel) {
    const overlay = this.element.find(`#${panel}-overlay`);
    const content = this._renderItemOverlay(item);
    overlay.html(content).removeClass('hidden');
    
    // Re-bind close button
    overlay.find('.overlay-close').on('click', this._onCloseOverlay.bind(this));
  }

  /**
   * Render item overlay content
   */
  _renderItemOverlay(item) {
    // This will be implemented with template or direct HTML
    return `
      <div class="overlay-header">
        <h2>${item.name}</h2>
        <button class="overlay-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="overlay-content">
        <p><strong>Type:</strong> ${item.type}</p>
        ${item.system.description?.value ? `<p>${item.system.description.value}</p>` : ''}
      </div>
    `;
  }

  /**
   * Handle equip/unequip toggle
   */
  async _onToggleEquip(event) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.dataset.itemId;
    const actor = this.actor;
    const item = actor.items.get(itemId);
    if (!item) return;

    await item.update({ 'system.equipped': !item.system.equipped });
  }

  /**
   * Handle attunement toggle
   */
  async _onAttuneItem(event) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.dataset.itemId;
    const actor = this.actor;
    const item = actor.items.get(itemId);
    if (!item) return;

    // Check attunement limit
    const attunedCount = actor.items.filter(i => i.system.attunement === 2).length;
    const newAttunement = item.system.attunement === 2 ? 0 : 2;

    if (newAttunement === 2 && attunedCount >= 3) {
      ui.notifications.warn('Maximum attunement slots (3) reached!');
      return;
    }

    await item.update({ 'system.attunement': newAttunement });
  }

  /**
   * Handle item use (consumables)
   */
  async _onUseItem(event) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.dataset.itemId;
    const actor = this.actor;
    const item = actor.items.get(itemId);
    if (!item) return;

    if (item.type === 'consumable' && item.system.uses) {
      const uses = item.system.uses.value || 0;
      if (uses > 0) {
        await item.update({ 'system.uses.value': uses - 1 });
      }
    } else if (typeof item.use === 'function') {
      await item.use();
    }
  }

  /**
   * Handle item rolls (weapons, spells)
   */
  async _onItemRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const actor = this.actor;
    const item = actor.items.get(itemId);
    if (!item) return;

    if (typeof item.roll === 'function') {
      await item.roll();
    }
  }

  /**
   * Handle spell casting
   */
  async _onCastSpell(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const actor = this.actor;
    const spell = actor.items.get(itemId);
    if (!spell || spell.type !== 'spell') return;

    const level = spell.system.level || 0;
    if (level > 0) {
      const slotKey = `spell${level}`;
      const slots = actor.system.spells[slotKey];
      if (slots && slots.value > 0) {
        // Decrement slot
        await actor.update({ [`system.spells.${slotKey}.value`]: slots.value - 1 });
        // Use spell
        if (typeof spell.use === 'function') {
          await spell.use();
        }
      } else {
        ui.notifications.warn('No spell slots remaining!');
      }
    } else {
      // Cantrip - no slot cost
      if (typeof spell.use === 'function') {
        await spell.use();
      }
    }
  }

  /**
   * Handle spell detail view
   */
  _onSpellDetail(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const actor = this.actor;
    const spell = actor.items.get(itemId);
    if (!spell) return;

    const panel = event.currentTarget.closest('.panel').dataset.panel;
    this._showSpellOverlay(spell, panel);
  }

  /**
   * Show spell overlay
   */
  _showSpellOverlay(spell, panel) {
    const overlay = this.element.find(`#${panel}-overlay`);
    const content = this._renderSpellOverlay(spell);
    overlay.html(content).removeClass('hidden');
    
    // Re-bind close button
    overlay.find('.overlay-close').on('click', this._onCloseOverlay.bind(this));
  }

  /**
   * Render spell overlay content
   */
  _renderSpellOverlay(spell) {
    return `
      <div class="overlay-header">
        <h2>${spell.name}</h2>
        <button class="overlay-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="overlay-content">
        <p><strong>Level:</strong> ${spell.system.level || 0} ${spell.system.school?.label || ''}</p>
        <p><strong>Casting Time:</strong> ${spell.system.time?.value || ''}</p>
        <p><strong>Range:</strong> ${spell.system.range?.value || ''}</p>
        <p><strong>Components:</strong> ${spell.system.components?.value || ''}</p>
        <p><strong>Duration:</strong> ${spell.system.duration?.value || ''}</p>
        ${spell.system.description?.value ? `<div class="spell-description">${spell.system.description.value}</div>` : ''}
      </div>
    `;
  }

  /**
   * Handle rest modal
   */
  _onRest(event) {
    event.preventDefault();
    this._showRestModal();
  }

  /**
   * Show rest modal
   */
  _showRestModal() {
    const modal = this.element.find('#rest-modal');
    modal.removeClass('hidden');
    
    // Update hit dice display
    const actor = this.actor;
    const hd = actor.system.attributes.hd;
    modal.find('#hd-count').text(`${hd.value}/${hd.max}`);
    
    // Wire up rest buttons
    modal.find('.roll-hd-btn').off('click').on('click', this._onRollHitDie.bind(this));
    modal.find('.long-rest-btn').off('click').on('click', this._onLongRest.bind(this));
    modal.find('.modal-close').off('click').on('click', () => {
      modal.addClass('hidden');
    });
  }

  /**
   * Handle hit die rolling (short rest)
   */
  async _onRollHitDie(event) {
    event.preventDefault();
    const actor = this.actor;
    const hd = actor.system.attributes.hd;
    
    if (hd.value <= 0) {
      ui.notifications.warn('No Hit Dice remaining!');
      return;
    }
    
    if (actor.system.attributes.hp.value >= actor.system.attributes.hp.max) {
      ui.notifications.warn('HP is already full.');
      return;
    }
    
    // Use Foundry's short rest dialog or custom roll
    if (typeof actor.rollShortRestDialog === 'function') {
      await actor.rollShortRestDialog();
    } else {
      // Fallback: manual HD roll
      const dieSize = hd.max > 0 ? parseInt(hd.max.toString().replace(/\D/g, '')) || 8 : 8;
      const conMod = Math.floor((actor.system.abilities.con.value - 10) / 2);
      const roll = new Roll(`1d${dieSize} + ${conMod}`);
      await roll.roll();
      const heal = roll.total;
      
      const newHP = Math.min(
        actor.system.attributes.hp.max,
        actor.system.attributes.hp.value + heal
      );
      
      await actor.update({
        'system.attributes.hp.value': newHP,
        'system.attributes.hd.value': hd.value - 1
      });
      
      ui.notifications.info(`Rolled ${heal}. HP restored to ${newHP}.`);
    }
    
    this._showRestModal(); // Refresh modal
  }

  /**
   * Handle long rest
   */
  async _onLongRest(event) {
    event.preventDefault();
    const actor = this.actor;
    
    if (typeof actor.longRest === 'function') {
      await actor.longRest({ dialog: false, chat: true });
    } else {
      // Fallback: manual long rest
      const hp = actor.system.attributes.hp;
      const hd = actor.system.attributes.hd;
      
      await actor.update({
        'system.attributes.hp.value': hp.max,
        'system.attributes.hd.value': Math.min(hd.value + Math.floor(hd.max / 2), hd.max)
      });
      
      // Reset spell slots
      const updates = {};
      for (let level = 1; level <= 9; level++) {
        const slotKey = `spell${level}`;
        if (actor.system.spells[slotKey]) {
          updates[`system.spells.${slotKey}.value`] = actor.system.spells[slotKey].max;
        }
      }
      if (Object.keys(updates).length > 0) {
        await actor.update(updates);
      }
      
      ui.notifications.info('Long Rest Complete. You feel refreshed.');
    }
    
    this.element.find('#rest-modal').addClass('hidden');
  }

  /**
   * Handle header popover toggles
   */
  _onHeaderPopover(event) {
    event.preventDefault();
    event.stopPropagation();
    const popoverType = event.currentTarget.dataset.popover;
    const popover = this.element.find(`#${popoverType}-popover`);
    
    // Toggle popover visibility
    if (popover.hasClass('hidden')) {
      this.element.find('.header-popover').addClass('hidden');
      popover.removeClass('hidden');
    } else {
      popover.addClass('hidden');
    }
    
    // Close popover when clicking outside
    $(document).off('click.mobileSheetPopover').on('click.mobileSheetPopover', (e) => {
      if (!$(e.target).closest('.header-popover, .header-popover-btn').length) {
        this.element.find('.header-popover').addClass('hidden');
        $(document).off('click.mobileSheetPopover');
      }
    });
    
    // Close button handler
    popover.find('.popover-close').off('click').on('click', () => {
      popover.addClass('hidden');
      $(document).off('click.mobileSheetPopover');
    });
  }

  /**
   * Toggle heroic inspiration
   */
  async _onToggleInspiration(event) {
    event.preventDefault();
    const actor = this.actor;
    const current = actor.system.attributes.inspiration || false;
    await actor.update({ 'system.attributes.inspiration': !current });
  }

  /**
   * Close overlay
   */
  _onCloseOverlay(event) {
    event.preventDefault();
    $(event.currentTarget).closest('.overlay').addClass('hidden');
  }
}


