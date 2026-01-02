# 5e SRD Spell Effect Detection - Implementation Plan

## Overview
This plan covers scanning the 5e SRD spell list and implementing detection/tracking for all spells that affect PC mechanical statistics in the mobile sheet.

## Mechanical Statistics Categories

### Core Statistics
1. **Ability Scores** (STR, DEX, CON, INT, WIS, CHA) - values and modifiers
2. **Armor Class (AC)** - base, bonuses, temporary
3. **Speed/Movement** - base speed, fly speed, swim speed, climb speed
4. **Hit Points** - current HP, max HP, temporary HP
5. **Saving Throws** - bonuses, advantage/disadvantage
6. **Skill Checks** - bonuses, advantage/disadvantage, proficiency
7. **Attack Rolls** - bonuses, advantage/disadvantage
8. **Damage Rolls** - bonuses, multipliers
9. **Initiative** - bonuses, advantage/disadvantage
10. **Proficiency Bonus** - modifications
11. **Action Economy** - extra actions, bonus actions, reactions (partially implemented)

---

## Phase 1: Spell Data Analysis & Categorization
**Estimated Tokens: ~80k**
**Goal:** Scan SRD spells and categorize by mechanical effect

### Task 1.1: Extract SRD Spell List (3k tokens)
- **Files:** `character-manager-app/assets/dnd5e-5.2.x/packs/_source/rules/spells-a-z.yml`
- **Actions:**
  - Parse YAML spell reference list
  - Extract all spell UUIDs/IDs
  - Create spell inventory database
  - Map spells to compendium entries

### Task 1.2: Categorize Ability Score Modifiers (5k tokens)
- **Spells to identify:**
  - Enhance Ability (INT, WIS, CHA)
  - Foresight (advantage on all ability checks)
  - Guidance (d4 to ability check)
  - Resistance (d4 to saving throw)
  - Bless (d4 to attack rolls and saving throws)
  - Bane (d4 penalty to attack rolls and saving throws)
  - Bestow Curse (ability score reduction)
  - Feeblemind (INT reduction)
  - Polymorph (ability score replacement)
- **Output:** List of spells with ability score effects

### Task 1.3: Categorize AC Modifiers (4k tokens)
- **Spells to identify:**
  - Mage Armor (+3 AC)
  - Barkskin (AC minimum 16)
  - Shield (+5 AC as reaction)
  - Shield of Faith (+2 AC)
  - Haste (+2 AC)
  - Slow (-2 AC)
  - Protection from Evil and Good (+2 AC vs certain creatures)
- **Output:** List of spells with AC effects

### Task 1.4: Categorize Speed/Movement Modifiers (4k tokens)
- **Spells to identify:**
  - Haste (double speed)
  - Slow (half speed)
  - Longstrider (+10 ft speed)
  - Expeditious Retreat (dash as bonus action)
  - Freedom of Movement (ignore difficult terrain)
  - Fly (fly speed)
  - Water Walk (walk on water)
  - Spider Climb (climb speed)
- **Output:** List of spells with movement effects

### Task 1.5: Categorize HP Modifiers (4k tokens)
- **Spells to identify:**
  - Aid (+5 max HP per level)
  - False Life (temporary HP)
  - Heroism (temporary HP each turn)
  - Armor of Agathys (temporary HP)
  - Vampiric Touch (heal on damage)
  - Regenerate (1 HP per turn)
- **Output:** List of spells with HP effects

### Task 1.6: Categorize Saving Throw Modifiers (5k tokens)
- **Spells to identify:**
  - Bless (+d4 to saving throws)
  - Bane (-d4 to saving throws)
  - Resistance (+d4 to saving throw)
  - Haste (advantage on DEX saves)
  - Protection from Evil and Good (advantage on saves)
  - Mind Blank (immunity to certain saves)
  - Death Ward (auto-succeed on death saves)
- **Output:** List of spells with saving throw effects

### Task 1.7: Categorize Skill Check Modifiers (5k tokens)
- **Spells to identify:**
  - Guidance (+d4 to ability check)
  - Enhance Ability (advantage on ability checks)
  - Foresight (advantage on all ability checks)
  - Pass without Trace (+10 to Stealth)
  - Skill Empowerment (double proficiency)
- **Output:** List of spells with skill check effects

### Task 1.8: Categorize Attack Roll Modifiers (4k tokens)
- **Spells to identify:**
  - Bless (+d4 to attack rolls)
  - Bane (-d4 to attack rolls)
  - True Strike (advantage on next attack)
  - Faerie Fire (advantage on attacks vs affected)
  - Guiding Bolt (advantage on next attack vs target)
- **Output:** List of spells with attack roll effects

### Task 1.9: Categorize Damage Modifiers (4k tokens)
- **Spells to identify:**
  - Hex (extra damage on attacks)
  - Hunter's Mark (extra damage on attacks)
  - Elemental Weapon (bonus damage)
  - Magic Weapon (bonus to attack and damage)
  - Divine Favor (extra radiant damage)
- **Output:** List of spells with damage effects

### Task 1.10: Categorize Initiative Modifiers (3k tokens)
- **Spells to identify:**
  - Gift of Alacrity (+d8 to initiative)
  - Foresight (advantage on initiative)
- **Output:** List of spells with initiative effects

### Task 1.11: Categorize Action Economy Modifiers (5k tokens)
- **Spells to identify:**
  - Haste (extra action)
  - Action Surge (Fighter feature, extra action)
  - Contingency (reaction-like ability)
  - Time Stop (multiple turns)
  - Slow (restricts actions)
  - Command/Suggestion (forces specific actions)
- **Output:** Enhanced list of action economy spells

### Task 1.12: Create Spell Effect Database (5k tokens)
- **Actions:**
  - Compile all categorized spells into JSON database
  - Map spell names to effect types
  - Include effect magnitude (bonus, multiplier, etc.)
  - Include duration information
  - Include concentration requirements
- **Output:** `5eMobile/data/spell-effects.json`

---

## Phase 2: Effect Detection System Implementation
**Estimated Tokens: ~90k**
**Goal:** Implement detection logic for each category

### Task 2.1: Create Spell Effect Detection Base Class (5k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Create base detection class
  - Load spell effects database
  - Implement effect matching logic
  - Handle effect stacking rules
  - Handle concentration conflicts

### Task 2.2: Implement Ability Score Detection (5k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect ability score bonuses/penalties
  - Detect ability score replacements (Polymorph)
  - Detect ability check bonuses (Guidance, Enhance Ability)
  - Calculate modified ability scores
  - Display in UI

### Task 2.3: Implement AC Detection (4k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`, `5eMobile/scripts/MobileSheet.js`
- **Actions:**
  - Detect AC bonuses (Shield, Shield of Faith, Haste)
  - Detect AC penalties (Slow)
  - Detect AC minimums (Barkskin)
  - Calculate modified AC
  - Display in header with breakdown

### Task 2.4: Implement Speed Detection (4k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect speed multipliers (Haste, Slow)
  - Detect speed bonuses (Longstrider)
  - Detect special movement types (Fly, Water Walk, Spider Climb)
  - Calculate modified speeds
  - Display in character modal or header

### Task 2.5: Implement HP Detection (4k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect max HP increases (Aid)
  - Detect temporary HP (False Life, Heroism)
  - Track HP regeneration (Regenerate)
  - Calculate effective HP
  - Display in header with breakdown

### Task 2.6: Implement Saving Throw Detection (5k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect saving throw bonuses (Bless, Resistance)
  - Detect saving throw penalties (Bane)
  - Detect advantage/disadvantage (Haste, Protection from Evil)
  - Calculate modified saving throws
  - Display in saves popover

### Task 2.7: Implement Skill Check Detection (5k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect skill bonuses (Guidance, Pass without Trace)
  - Detect advantage on skills (Enhance Ability, Foresight)
  - Detect proficiency modifications (Skill Empowerment)
  - Calculate modified skill bonuses
  - Display in skills tab

### Task 2.8: Implement Attack Roll Detection (4k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect attack bonuses (Bless)
  - Detect attack penalties (Bane)
  - Detect advantage/disadvantage (True Strike, Faerie Fire)
  - Calculate modified attack bonuses
  - Display in weapon/spell tooltips

### Task 2.9: Implement Damage Detection (4k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect damage bonuses (Hex, Hunter's Mark)
  - Detect damage multipliers
  - Detect damage type modifications
  - Calculate modified damage
  - Display in weapon/spell tooltips

### Task 2.10: Implement Initiative Detection (3k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect initiative bonuses (Gift of Alacrity)
  - Detect advantage on initiative (Foresight)
  - Calculate modified initiative
  - Display in header

### Task 2.11: Enhance Action Economy Detection (5k tokens)
- **Files:** `5eMobile/scripts/MobileSheet.js`
- **Actions:**
  - Expand current action economy detection
  - Add detection for all action-granting spells
  - Handle complex cases (Time Stop, Contingency)
  - Track action restrictions (Slow)

### Task 2.12: Create Effect Stacking Rules Engine (5k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Implement stacking rules (same spell doesn't stack)
  - Handle concentration conflicts
  - Handle effect priority (highest bonus wins, etc.)
  - Handle effect cancellation (Dispel Magic, etc.)

---

## Phase 3: UI Integration & Display
**Estimated Tokens: ~70k**
**Goal:** Display detected effects in the mobile sheet UI

### Task 3.1: Create Effect Indicator Component (5k tokens)
- **Files:** `5eMobile/templates/effect-indicator.hbs`, `5eMobile/styles/mobile-sheet.css`
- **Actions:**
  - Design effect indicator UI
  - Show active effects with icons
  - Display effect duration
  - Show effect source (who cast it)

### Task 3.2: Update Header with Effect Indicators (5k tokens)
- **Files:** `5eMobile/templates/header.hbs`, `5eMobile/scripts/MobileSheet.js`
- **Actions:**
  - Add effect indicators to AC, HP, Initiative
  - Show breakdown on click
  - Display temporary modifiers
  - Color-code positive/negative effects

### Task 3.3: Update Skills Tab with Effect Modifiers (4k tokens)
- **Files:** `5eMobile/templates/tab-skills.hbs`, `5eMobile/scripts/MobileSheet.js`
- **Actions:**
  - Show modified skill bonuses
  - Display effect sources
  - Show advantage/disadvantage indicators
  - Highlight affected skills

### Task 3.4: Update Stats Tab with Effect Modifiers (4k tokens)
- **Files:** `5eMobile/templates/tab-stats.hbs`, `5eMobile/scripts/MobileSheet.js`
- **Actions:**
  - Show modified ability scores
  - Display effect sources
  - Show temporary vs permanent modifiers
  - Highlight affected abilities

### Task 3.5: Update Actions Tab with Effect Modifiers (4k tokens)
- **Files:** `5eMobile/templates/tab-actions.hbs`, `5eMobile/scripts/MobileSheet.js`
- **Actions:**
  - Show modified attack bonuses
  - Display damage modifiers
  - Show advantage/disadvantage on attacks
  - Highlight affected weapons/spells

### Task 3.6: Create Effect Details Modal (5k tokens)
- **Files:** `5eMobile/templates/effect-details-modal.hbs`, `5eMobile/scripts/MobileSheet.js`
- **Actions:**
  - Show all active effects
  - Display effect details (source, duration, magnitude)
  - Show affected statistics
  - Allow dismissing effects (if player has permission)

### Task 3.7: Add Effect Tooltips (4k tokens)
- **Files:** `5eMobile/scripts/MobileSheet.js`, `5eMobile/styles/mobile-sheet.css`
- **Actions:**
  - Add tooltips to modified statistics
  - Show effect breakdown on hover
  - Display calculation formulas
  - Show effect sources

### Task 3.8: Create Effect Status Bar (4k tokens)
- **Files:** `5eMobile/templates/header.hbs`, `5eMobile/styles/mobile-sheet.css`
- **Actions:**
  - Add persistent effect status bar
  - Show active concentration spells
  - Display temporary effects count
  - Quick access to effect details

### Task 3.9: Update Detail Modals with Effect Info (4k tokens)
- **Files:** `5eMobile/templates/detail-modal.hbs`, `5eMobile/scripts/MobileSheet.js`
- **Actions:**
  - Show effects affecting the stat/item
  - Display modified values vs base values
  - Show effect calculations
  - Link to effect sources

### Task 3.10: Add Effect Notifications (3k tokens)
- **Files:** `5eMobile/scripts/main.js`
- **Actions:**
  - Notify when effects are applied
  - Notify when effects expire
  - Notify when concentration is broken
  - Show effect changes in chat

---

## Phase 4: Advanced Features & Edge Cases
**Estimated Tokens: ~60k**
**Goal:** Handle complex spell interactions and edge cases

### Task 4.1: Handle Polymorph Effects (5k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect Polymorph, True Polymorph, Shapechange
  - Replace ability scores with new form
  - Replace movement speeds
  - Replace AC calculation
  - Handle HP changes

### Task 4.2: Handle Wild Shape (Druid) (4k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect Wild Shape usage
  - Apply beast form statistics
  - Track remaining uses
  - Handle form switching

### Task 4.3: Handle Rage (Barbarian) (3k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect Rage activation
  - Apply damage resistance
  - Apply damage bonus
  - Track rage duration

### Task 4.4: Handle Concentration Tracking (5k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`, `5eMobile/scripts/MobileSheet.js`
- **Actions:**
  - Track active concentration spells
  - Detect concentration breaks
  - Show concentration saves
  - Warn when casting new concentration spell

### Task 4.5: Handle Dispel Magic & Counterspell (4k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect when effects are dispelled
  - Remove dispelled effects
  - Handle Counterspell interactions
  - Update UI when effects removed

### Task 4.6: Handle Spell Upcasting Effects (4k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect spell level used
  - Apply level-based modifications
  - Handle Aid upcasting (more HP)
  - Handle other upcast effects

### Task 4.7: Handle Magic Item Interactions (5k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Detect magic item effects
  - Combine with spell effects
  - Handle attunement requirements
  - Show combined bonuses

### Task 4.8: Handle Temporary vs Permanent Effects (4k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Distinguish temporary spell effects
  - Distinguish permanent class features
  - Show different UI for each
  - Handle effect expiration

### Task 4.9: Handle Multiple Casters (4k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Track who cast each effect
  - Show caster information
  - Handle same spell from different casters
  - Show effect ownership

### Task 4.10: Handle Effect Duration Tracking (5k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Track effect durations
  - Count down rounds/turns
  - Warn when effects expiring
  - Auto-remove expired effects

### Task 4.11: Handle Advantage/Disadvantage Stacking (4k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Track multiple advantage sources
  - Track multiple disadvantage sources
  - Apply stacking rules (cancel out)
  - Show net advantage/disadvantage

### Task 4.12: Create Effect Testing Framework (5k tokens)
- **Files:** `5eMobile/tests/spell-effects.test.js`
- **Actions:**
  - Create test cases for each spell
  - Test effect detection
  - Test effect stacking
  - Test effect removal
  - Test edge cases

---

## Phase 5: Performance & Optimization
**Estimated Tokens: ~40k**
**Goal:** Optimize detection system for performance

### Task 5.1: Optimize Effect Detection Performance (5k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Cache effect calculations
  - Only recalculate on changes
  - Debounce effect updates
  - Optimize effect matching

### Task 5.2: Implement Effect Change Detection (4k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Only update when effects change
  - Track effect state changes
  - Minimize re-renders
  - Batch effect updates

### Task 5.3: Optimize Database Lookups (4k tokens)
- **Files:** `5eMobile/data/spell-effects.json`, `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Index spell database
  - Cache spell lookups
  - Lazy load spell data
  - Minimize database queries

### Task 5.4: Optimize UI Updates (4k tokens)
- **Files:** `5eMobile/scripts/MobileSheet.js`
- **Actions:**
  - Only update changed UI elements
  - Use virtual DOM techniques
  - Minimize DOM manipulation
  - Batch UI updates

### Task 5.5: Add Effect Detection Logging (3k tokens)
- **Files:** `5eMobile/scripts/SpellEffectDetector.js`
- **Actions:**
  - Add debug logging
  - Track detection performance
  - Log effect calculations
  - Performance metrics

---

## Phase 6: Documentation & User Guide
**Estimated Tokens: ~30k**
**Goal:** Document the system for users and developers

### Task 6.1: Create Spell Effect Reference Guide (5k tokens)
- **Files:** `5eMobile/docs/SPELL_EFFECTS.md`
- **Actions:**
  - Document all detected spells
  - Explain effect calculations
  - Show examples
  - List known limitations

### Task 6.2: Create Developer Documentation (5k tokens)
- **Files:** `5eMobile/docs/DEVELOPER_GUIDE.md`
- **Actions:**
  - Document detection system architecture
  - Explain how to add new spells
  - Show code examples
  - API documentation

### Task 6.3: Create User Guide (4k tokens)
- **Files:** `5eMobile/README.md`
- **Actions:**
  - Explain how effects are displayed
  - Show how to interpret indicators
  - Explain effect tooltips
  - Troubleshooting guide

### Task 6.4: Create Effect Examples (4k tokens)
- **Files:** `5eMobile/docs/EXAMPLES.md`
- **Actions:**
  - Show common spell combinations
  - Demonstrate effect stacking
  - Show edge cases
  - Visual examples

---

## Summary

**Total Estimated Tokens:** ~370k
**Total Phases:** 6
**Total Tasks:** 72

**Phase Breakdown:**
- Phase 1: 80k tokens (12 tasks)
- Phase 2: 90k tokens (12 tasks)
- Phase 3: 70k tokens (10 tasks)
- Phase 4: 60k tokens (12 tasks)
- Phase 5: 40k tokens (5 tasks)
- Phase 6: 30k tokens (4 tasks)

**Next Steps:**
1. Begin with Phase 1, Task 1.1
2. Complete each task sequentially
3. Test after each phase
4. Refine based on testing results

