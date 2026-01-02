# AOE Targeting Solutions for 5eMobile

This document outlines 5 comprehensive solutions for handling Area of Effect (AOE) spells in the 5eMobile module, including mass saving throws and damage application.

## Overview

AOE spells require special handling because they:
- Affect multiple targets simultaneously
- May require saving throws from each target
- Apply damage/effects based on save results (half damage on success, full on failure)
- Need to track which targets are affected for effect generation
- Must respect spell targeting rules (include/exclude allies, self, etc.)

## Solution 1: Canvas-Based AOE Template System

### Description
Use Foundry VTT's built-in AOE template system to visually place and calculate affected targets.

### Implementation

**Pros:**
- Leverages Foundry's native AOE template system
- Visual feedback for players and GM
- Automatic target calculation based on template shape
- Supports all AOE types (radius, line, cone, cube, sphere)

**Cons:**
- Requires canvas interaction (may be difficult on mobile)
- More complex implementation
- Requires GM to place templates in some cases

**Code Structure:**
```javascript
// In targeting.js
export async function placeAOETemplate(caster, spell, aoeType, aoeSize) {
  // Use Foundry's MeasuredTemplate system
  const templateData = {
    t: aoeType, // 'circle', 'cone', 'line', 'rect', 'ray'
    distance: aoeSize,
    direction: 0, // For cones/lines
    x: casterToken.x,
    y: casterToken.y
  };
  
  const template = new MeasuredTemplate(templateData);
  await template.draw();
  
  // Get all tokens within template
  const targets = canvas.tokens.placeables.filter(token => {
    return template.shape.contains(token.center.x, token.center.y);
  });
  
  return targets.map(t => ({
    tokenId: t.id,
    actorId: t.actor.id,
    name: t.actor.name,
    distance: calculateDistance(casterToken, t),
    ac: t.actor.system.attributes.ac.value
  }));
}
```

**Saving Throw Processing:**
```javascript
export async function processAOESavingThrows(targets, spell, dc, ability) {
  const results = [];
  
  for (const target of targets) {
    const actor = game.actors.get(target.actorId);
    const saveResult = await calculateSavingThrow(actor, ability, dc);
    
    results.push({
      ...target,
      saveSuccess: saveResult.success,
      saveRoll: saveResult.rollTotal,
      saveModifier: saveResult.modifier
    });
  }
  
  return results;
}
```

**Damage Application:**
```javascript
export async function applyAOEDamage(targets, spell, damageFormula, halfOnSave) {
  const damageRoll = new Roll(damageFormula);
  await damageRoll.roll();
  const fullDamage = damageRoll.total;
  
  const results = [];
  
  for (const target of targets) {
    const actor = game.actors.get(target.actorId);
    const damage = target.saveSuccess && halfOnSave 
      ? Math.floor(fullDamage / 2)
      : fullDamage;
    
    const damageResult = await applyDamage(actor, damage, {
      damageType: spell.system.damage?.parts[0]?.[1] || 'force'
    });
    
    results.push({
      ...target,
      damage: damage,
      newHP: damageResult.newHP,
      isDead: damageResult.isDead
    });
  }
  
  return results;
}
```

---

## Solution 2: Token Selection Interface

### Description
Present a list of all tokens in the AOE area and allow the player to select which ones are affected.

### Implementation

**Pros:**
- Simple to implement
- Works well on mobile (touch-friendly list)
- Player has control over targeting
- No canvas interaction required

**Cons:**
- Requires manual selection
- May miss targets if player doesn't see them
- Less automated than other solutions

**Code Structure:**
```javascript
// In MobileSheet.js
async _showAOETargetSelection(item, actionType, aoeType, aoeSize) {
  const actor = this.actor;
  const centerToken = getActorToken(actor);
  
  // Get all potential targets in area
  const potentialTargets = getAOETargets(actor, centerToken, aoeType, aoeSize, {
    includeAllies: false,
    includeSelf: false
  });
  
  // Show selection modal with checkboxes
  const modal = $(`
    <div class="aoe-target-selection-modal">
      <div class="modal-header">
        <h3>AOE Spell: ${item.name}</h3>
        <p>${aoeType.toUpperCase()} ${aoeSize} ft</p>
      </div>
      <div class="modal-content">
        <div class="target-list">
          ${potentialTargets.map(t => `
            <label class="target-checkbox">
              <input type="checkbox" value="${t.actorId}" data-token-id="${t.tokenId}" data-ac="${t.ac}">
              <span>${t.name} (AC ${t.ac}, ${t.distance} ft)</span>
            </label>
          `).join('')}
        </div>
        <div class="modal-actions">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-confirm">Cast Spell</button>
        </div>
      </div>
    </div>
  `);
  
  // Handle confirmation
  modal.find('.btn-confirm').on('click', async () => {
    const selected = modal.find('input:checked').map((i, el) => ({
      actorId: $(el).val(),
      tokenId: $(el).data('token-id'),
      ac: $(el).data('ac')
    })).get();
    
    await this._executeAOEAction(item, actionType, selected);
    modal.remove();
  });
}
```

**Batch Processing:**
```javascript
async _executeAOEAction(item, actionType, selectedTargets) {
  // Get spell DC and saving throw ability
  const spell = item;
  const caster = this.actor;
  const dc = 8 + getProficiencyBonus(caster.system.details.level) + 
              caster.system.abilities[spell.system.save?.ability]?.mod || 0;
  const saveAbility = spell.system.save?.ability || 'dex';
  
  // Process saving throws for all targets
  const saveResults = await Promise.all(
    selectedTargets.map(async (target) => {
      const actor = game.actors.get(target.actorId);
      return await calculateSavingThrow(actor, saveAbility, dc);
    })
  );
  
  // Apply damage based on save results
  const damageFormula = spell.system.damage?.parts[0]?.[0] || '1d4';
  const damageRoll = new Roll(damageFormula);
  await damageRoll.roll();
  const fullDamage = damageRoll.total;
  
  // Apply damage to each target
  for (let i = 0; i < selectedTargets.length; i++) {
    const target = selectedTargets[i];
    const saveResult = saveResults[i];
    const actor = game.actors.get(target.actorId);
    
    const damage = saveResult.success 
      ? Math.floor(fullDamage / 2)  // Half damage on save
      : fullDamage;                  // Full damage on fail
    
    await applyDamage(actor, damage, {
      damageType: spell.system.damage?.parts[0]?.[1] || 'force'
    });
  }
  
  // Create comprehensive chat message
  await this._createAOEChatMessage(item, selectedTargets, saveResults, fullDamage);
}
```

---

## Solution 3: Automatic AOE Calculation with Confirmation

### Description
Automatically calculate all targets in AOE area, show summary, and require single confirmation to process all.

### Implementation

**Pros:**
- Fully automated target detection
- Single confirmation for all targets
- Fast workflow
- Good for mobile (minimal interaction)

**Cons:**
- Less control over individual targets
- May include unintended targets
- Requires accurate AOE shape calculation

**Code Structure:**
```javascript
// In targeting.js
export function calculateAOETargetsAuto(caster, centerToken, aoeType, aoeSize) {
  const targets = getAOETargets(caster, centerToken, aoeType, aoeSize);
  
  // Group by distance for display
  const grouped = targets.reduce((acc, target) => {
    const dist = Math.floor(target.distance / 5) * 5; // Round to nearest 5ft
    if (!acc[dist]) acc[dist] = [];
    acc[dist].push(target);
    return acc;
  }, {});
  
  return {
    targets: targets,
    grouped: grouped,
    count: targets.length,
    summary: Object.entries(grouped).map(([dist, targs]) => 
      `${targs.length} target(s) at ${dist}ft`
    ).join(', ')
  };
}

// In MobileSheet.js
async _showAOEConfirmation(item, aoeType, aoeSize) {
  const actor = this.actor;
  const centerToken = getActorToken(actor);
  
  const aoeData = calculateAOETargetsAuto(actor, centerToken, aoeType, aoeSize);
  
  if (aoeData.count === 0) {
    ui.notifications.warn('No targets in AOE area');
    return;
  }
  
  // Show confirmation with summary
  const confirmed = await new Promise((resolve) => {
    const modal = $(`
      <div class="aoe-confirmation-modal">
        <div class="modal-header">
          <h3>${item.name}</h3>
          <p>${aoeType.toUpperCase()} ${aoeSize}ft</p>
        </div>
        <div class="modal-content">
          <div class="aoe-summary">
            <p><strong>${aoeData.count} targets found:</strong></p>
            <ul class="target-summary-list">
              ${aoeData.targets.map(t => `
                <li>${t.name} (AC ${t.ac}, ${t.distance}ft)</li>
              `).join('')}
            </ul>
            <p class="summary-text">${aoeData.summary}</p>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-confirm">Cast on All Targets</button>
          </div>
        </div>
      </div>
    `);
    
    $('body').append(modal);
    
    modal.find('.btn-cancel').on('click', () => {
      modal.remove();
      resolve(false);
    });
    
    modal.find('.btn-confirm').on('click', () => {
      modal.remove();
      resolve(true);
    });
  });
  
  if (confirmed) {
    await this._processAOEBatch(item, aoeData.targets);
  }
}
```

**Batch Processing with Chat Summary:**
```javascript
async _processAOEBatch(spell, targets) {
  const caster = this.actor;
  const dc = this._calculateSpellDC(caster, spell);
  const saveAbility = spell.system.save?.ability || 'dex';
  const damageFormula = spell.system.damage?.parts[0]?.[0] || '1d4';
  
  // Roll damage once
  const damageRoll = new Roll(damageFormula);
  await damageRoll.roll();
  const fullDamage = damageRoll.total;
  
  // Process all targets
  const results = [];
  for (const target of targets) {
    const actor = game.actors.get(target.actorId);
    const saveResult = await calculateSavingThrow(actor, saveAbility, dc);
    const damage = saveResult.success ? Math.floor(fullDamage / 2) : fullDamage;
    const damageResult = await applyDamage(actor, damage, {
      damageType: spell.system.damage?.parts[0]?.[1] || 'force'
    });
    
    results.push({
      name: target.name,
      saveSuccess: saveResult.success,
      saveRoll: saveResult.rollTotal,
      damage: damage,
      previousHP: damageResult.previousHP,
      newHP: damageResult.newHP,
      isDead: damageResult.isDead
    });
  }
  
  // Create comprehensive chat message
  await ChatMessage.create({
    user: game.user.id,
    speaker: { actor: caster.id },
    content: `
      <div class="dnd5e chat-card aoe-card">
        <header class="card-header flexrow">
          <h3>${spell.name} - AOE Effect</h3>
        </header>
        <div class="card-content">
          <p><strong>Damage Roll:</strong> ${damageRoll.formula} = ${fullDamage}</p>
          <p><strong>DC:</strong> ${dc} ${saveAbility.toUpperCase()} save</p>
          <table class="aoe-results-table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Save</th>
                <th>Damage</th>
                <th>HP</th>
              </tr>
            </thead>
            <tbody>
              ${results.map(r => `
                <tr class="${r.isDead ? 'dead' : ''}">
                  <td>${r.name}</td>
                  <td>${r.saveSuccess ? '✓' : '✗'} (${r.saveRoll})</td>
                  <td>${r.damage}</td>
                  <td>${r.previousHP} → ${r.newHP}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER
  });
}
```

---

## Solution 4: Progressive AOE with Individual Confirmations

### Description
Show targets one by one, allowing player to confirm or skip each target individually.

### Implementation

**Pros:**
- Maximum control over targeting
- Can skip unintended targets
- Good for complex scenarios
- Clear feedback for each target

**Cons:**
- Slower workflow (multiple confirmations)
- More taps/clicks required
- May be tedious for large AOEs

**Code Structure:**
```javascript
async _processAOEProgressive(spell, targets) {
  const caster = this.actor;
  const dc = this._calculateSpellDC(caster, spell);
  const saveAbility = spell.system.save?.ability || 'dex';
  const damageFormula = spell.system.damage?.parts[0]?.[0] || '1d4';
  
  // Roll damage once
  const damageRoll = new Roll(damageFormula);
  await damageRoll.roll();
  const fullDamage = damageRoll.total;
  
  const results = [];
  let index = 0;
  
  // Process targets one by one
  while (index < targets.length) {
    const target = targets[index];
    const confirmed = await this._confirmSingleTarget(target, spell.name, index + 1, targets.length);
    
    if (confirmed) {
      const actor = game.actors.get(target.actorId);
      const saveResult = await calculateSavingThrow(actor, saveAbility, dc);
      const damage = saveResult.success ? Math.floor(fullDamage / 2) : fullDamage;
      const damageResult = await applyDamage(actor, damage, {
        damageType: spell.system.damage?.parts[0]?.[1] || 'force'
      });
      
      results.push({
        name: target.name,
        saveSuccess: saveResult.success,
        saveRoll: saveResult.rollTotal,
        damage: damage,
        newHP: damageResult.newHP,
        isDead: damageResult.isDead
      });
    }
    
    index++;
  }
  
  // Create summary chat message
  await this._createAOEChatMessage(spell, results, fullDamage);
}

async _confirmSingleTarget(target, spellName, current, total) {
  return new Promise((resolve) => {
    const modal = $(`
      <div class="aoe-single-target-modal">
        <div class="modal-header">
          <h3>${spellName} - Target ${current} of ${total}</h3>
        </div>
        <div class="modal-content">
          <div class="target-info">
            <p><strong>${target.name}</strong></p>
            <p>AC: ${target.ac}</p>
            <p>Distance: ${target.distance}ft</p>
          </div>
          <div class="modal-actions">
            <button class="btn-skip">Skip</button>
            <button class="btn-include">Include</button>
          </div>
        </div>
      </div>
    `);
    
    $('body').append(modal);
    
    modal.find('.btn-skip').on('click', () => {
      modal.remove();
      resolve(false);
    });
    
    modal.find('.btn-include').on('click', () => {
      modal.remove();
      resolve(true);
    });
  });
}
```

---

## Solution 5: Hybrid System with Smart Defaults

### Description
Combine automatic calculation with optional manual override. Automatically include all valid targets, but allow player to exclude specific ones before processing.

### Implementation

**Pros:**
- Best of both worlds (automation + control)
- Fast default workflow
- Flexible for edge cases
- Good mobile UX

**Cons:**
- More complex implementation
- Requires both automatic and manual modes

**Code Structure:**
```javascript
async _showAOEHybridSelection(item, aoeType, aoeSize) {
  const actor = this.actor;
  const centerToken = getActorToken(actor);
  
  // Automatically calculate all targets
  const allTargets = getAOETargets(actor, centerToken, aoeType, aoeSize, {
    includeAllies: false,
    includeSelf: false
  });
  
  // Show modal with all targets pre-selected
  const selectedTargets = [...allTargets]; // Start with all selected
  const confirmed = await new Promise((resolve) => {
    const modal = $(`
      <div class="aoe-hybrid-modal">
        <div class="modal-header">
          <h3>${item.name}</h3>
          <p>${aoeType.toUpperCase()} ${aoeSize}ft - ${allTargets.length} targets found</p>
        </div>
        <div class="modal-content">
          <div class="target-list">
            ${allTargets.map((t, idx) => `
              <label class="target-checkbox">
                <input type="checkbox" value="${t.actorId}" 
                       data-token-id="${t.tokenId}" 
                       data-ac="${t.ac}"
                       checked>
                <span>${t.name} (AC ${t.ac}, ${t.distance}ft)</span>
              </label>
            `).join('')}
          </div>
          <div class="quick-actions">
            <button class="btn-select-all">Select All</button>
            <button class="btn-deselect-all">Deselect All</button>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-confirm">Cast Spell</button>
          </div>
        </div>
      </div>
    `);
    
    $('body').append(modal);
    
    // Quick action handlers
    modal.find('.btn-select-all').on('click', () => {
      modal.find('input[type="checkbox"]').prop('checked', true);
    });
    
    modal.find('.btn-deselect-all').on('click', () => {
      modal.find('input[type="checkbox"]').prop('checked', false);
    });
    
    modal.find('.btn-cancel').on('click', () => {
      modal.remove();
      resolve(null);
    });
    
    modal.find('.btn-confirm').on('click', () => {
      const selected = modal.find('input:checked').map((i, el) => {
        const target = allTargets.find(t => t.actorId === $(el).val());
        return target;
      }).get();
      
      modal.remove();
      resolve(selected);
    });
  });
  
  if (confirmed && confirmed.length > 0) {
    await this._processAOEBatch(item, confirmed);
  } else if (confirmed && confirmed.length === 0) {
    ui.notifications.warn('No targets selected');
  }
}
```

**Enhanced Batch Processing:**
```javascript
async _processAOEBatch(spell, targets) {
  const caster = this.actor;
  const dc = this._calculateSpellDC(caster, spell);
  const saveAbility = spell.system.save?.ability || 'dex';
  const damageFormula = spell.system.damage?.parts[0]?.[0] || '1d4';
  const halfOnSave = spell.system.save?.scaling === 'half';
  
  // Roll damage once for all targets
  const damageRoll = new Roll(damageFormula);
  await damageRoll.roll();
  const fullDamage = damageRoll.total;
  
  // Process all targets in parallel (faster)
  const results = await Promise.all(
    targets.map(async (target) => {
      const actor = game.actors.get(target.actorId);
      
      // Calculate saving throw
      const saveResult = await calculateSavingThrow(actor, saveAbility, dc);
      
      // Calculate damage based on save
      const damage = (saveResult.success && halfOnSave)
        ? Math.floor(fullDamage / 2)
        : fullDamage;
      
      // Apply damage
      const damageResult = await applyDamage(actor, damage, {
        damageType: spell.system.damage?.parts[0]?.[1] || 'force'
      });
      
      return {
        name: target.name,
        saveSuccess: saveResult.success,
        saveRoll: saveResult.rollTotal,
        naturalRoll: saveResult.roll,
        modifier: saveResult.modifier,
        damage: damage,
        previousHP: damageResult.previousHP,
        newHP: damageResult.newHP,
        isDead: damageResult.isDead
      };
    })
  );
  
  // Create detailed chat message
  await this._createDetailedAOEChatMessage(spell, results, fullDamage, dc, saveAbility);
  
  // Apply effects to targets (if spell has effects)
  if (spell.system.effects && spell.system.effects.length > 0) {
    await this._applyAOEEffects(spell, results.filter(r => !r.saveSuccess));
  }
}

async _applyAOEEffects(spell, failedTargets) {
  // Apply spell effects to targets that failed their save
  for (const target of failedTargets) {
    const actor = game.actors.get(target.actorId);
    // Create active effect from spell
    if (spell.system.effects) {
      await actor.createEmbeddedDocuments('ActiveEffect', spell.system.effects);
    }
  }
}
```

---

## Recommendation

**Recommended Solution: Solution 5 (Hybrid System)**

This solution provides the best balance of:
- **Automation**: Automatically finds all valid targets
- **Control**: Player can exclude unintended targets
- **Speed**: Single confirmation processes all targets
- **Mobile-Friendly**: Touch-optimized interface
- **Flexibility**: Works for all AOE types and scenarios

### Implementation Priority

1. **Phase 1**: Implement basic AOE target detection (Solution 3 - Automatic)
2. **Phase 2**: Add manual override capability (Solution 5 - Hybrid)
3. **Phase 3**: Add visual template system for GM use (Solution 1 - Canvas-based)
4. **Phase 4**: Add progressive mode for complex scenarios (Solution 4 - Progressive)

### Key Features to Implement

1. **Range Calculation**: Use Foundry's grid system to calculate distances
2. **Line of Sight**: Leverage Foundry's visibility system
3. **Saving Throws**: Batch process all targets with individual rolls
4. **Damage Application**: Apply half/full damage based on save results
5. **Effect Generation**: Automatically apply spell effects to failed saves
6. **Chat Integration**: Create comprehensive chat messages showing all results
7. **Mobile UI**: Touch-friendly target selection interface

### Additional Considerations

- **Resistances/Vulnerabilities**: Factor into damage calculation
- **Cover**: May affect saving throws or provide AC bonuses
- **Spell Resistance**: Some creatures have spell resistance
- **Concentration**: Track if caster maintains concentration
- **Duration Effects**: Apply ongoing effects for spells with duration

