/**
 * 5eMobile Module
 * Mobile-first character sheet for Foundry VTT
 */

import { MobileActorSheet5e } from './MobileSheet.js';
import { isMobileDevice } from './utils.js';
import './sync.js';

const MODULE_ID = '5eMobile';

/**
 * Initialize module settings
 */
function initSettings() {
  game.settings.register(MODULE_ID, 'forceMobileSheet', {
    name: 'Force Mobile Sheet',
    hint: 'Always use mobile sheet regardless of device detection',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    requiresReload: false
  });

  game.settings.register(MODULE_ID, 'suppressFoundryUI', {
    name: 'Suppress Foundry UI on Mobile',
    hint: 'Hide sidebar and canvas when mobile sheet is active',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false
  });
}

/**
 * Register the mobile actor sheet
 */
function registerMobileSheet() {
  try {
    // Wait for dnd5e system to be available
    if (typeof dnd5e === 'undefined' || !dnd5e.applications?.actor?.CharacterActorSheet) {
      console.warn('5eMobile: dnd5e CharacterActorSheet not available yet, retrying...');
      setTimeout(registerMobileSheet, 100);
      return;
    }

    if (!MobileActorSheet5e) {
      console.error('5eMobile: MobileActorSheet5e class not found');
      return;
    }

    // Use Foundry v11+ sheet registration API
    // For v11+, use Actors.registerSheet with system ID
    if (Actors?.registerSheet) {
      Actors.registerSheet('dnd5e', MobileActorSheet5e, {
        types: ['character'],
        makeDefault: false,
        label: '5eMobile Sheet'
      });
      console.log('5eMobile: Sheet registered successfully using Actors.registerSheet');
    } 
    // Fallback for v10: use DocumentSheetConfig
    else if (foundry.applications?.apps?.DocumentSheetConfig) {
      const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
      DocumentSheetConfig.registerSheet(Actor, MODULE_ID, MobileActorSheet5e, {
        types: ['character'],
        makeDefault: false,
        label: '5eMobile Sheet'
      });
      console.log('5eMobile: Sheet registered successfully using DocumentSheetConfig');
    } 
    // Last resort: direct CONFIG registration (v9/v10)
    else if (CONFIG?.Actor?.sheetClasses) {
      console.warn('5eMobile: Using fallback sheet registration method');
      if (!CONFIG.Actor.sheetClasses.character) {
        CONFIG.Actor.sheetClasses.character = {};
      }
      CONFIG.Actor.sheetClasses.character[`${MODULE_ID}.MobileActorSheet5e`] = MobileActorSheet5e;
      console.log('5eMobile: Sheet registered successfully using CONFIG fallback');
    } else {
      console.error('5eMobile: No valid sheet registration method found');
    }
  } catch (error) {
    console.error('5eMobile: Error registering sheet:', error);
    console.error(error.stack);
  }
}

/**
 * Auto-switch to mobile sheet on mobile devices
 */
function autoSwitchToMobileSheet() {
  Hooks.on('renderActorSheet', (app, html, data) => {
    // Check if this is a character sheet and we should use mobile
    if (data.actor?.type !== 'character') return;
    
    const shouldUseMobile = game.settings.get(MODULE_ID, 'forceMobileSheet') || isMobileDevice();
    
    if (shouldUseMobile && app.constructor.name !== 'MobileActorSheet5e') {
      // Close current sheet and open mobile sheet
      app.close();
      setTimeout(() => {
        const mobileSheet = new MobileActorSheet5e(data.actor);
        mobileSheet.render(true);
      }, 100);
    }
  });
}

/**
 * Suppress Foundry UI when mobile sheet is active
 */
function setupUISuppression() {
  const suppressUI = game.settings.get(MODULE_ID, 'suppressFoundryUI');
  
  if (!suppressUI) return;

  Hooks.on('renderActorSheet', (app, html, data) => {
    if (app instanceof MobileActorSheet5e) {
      // Add class to body to trigger CSS hiding
      document.body.classList.add('mobile-sheet-active');
    }
  });

  Hooks.on('closeActorSheet', (app, html) => {
    if (app instanceof MobileActorSheet5e) {
      document.body.classList.remove('mobile-sheet-active');
    }
  });
}

// Register Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

Handlebars.registerHelper('lowercase', function(str) {
  return typeof str === 'string' ? str.toLowerCase() : str;
});

Handlebars.registerHelper('default', function(value, defaultValue) {
  return value != null ? value : defaultValue;
});

// Preload Handlebars templates
async function preloadTemplates() {
  const templatePaths = [
    'modules/5eMobile/templates/sheet.hbs',
    'modules/5eMobile/templates/header.hbs',
    'modules/5eMobile/templates/tab-actions.hbs',
    'modules/5eMobile/templates/tab-inventory.hbs',
    'modules/5eMobile/templates/tab-bio.hbs',
    'modules/5eMobile/templates/tab-features.hbs'
  ];

  const paths = {};
  for (const path of templatePaths) {
    // Register as partials using the filename
    const name = path.split('/').pop().replace('.hbs', '');
    paths[`5eMobile.${name}`] = path;
  }

  return foundry.applications.handlebars.loadTemplates(paths);
}

// Initialize on init
Hooks.once('init', async () => {
  initSettings();
  await preloadTemplates();
  console.log('5eMobile: Module initialized and templates preloaded');
});

// Register sheet and setup hooks on ready (after dnd5e system is loaded)
Hooks.once('ready', () => {
  console.log('5eMobile: Ready hook fired');
  console.log('5eMobile: dnd5e available?', typeof dnd5e !== 'undefined');
  console.log('5eMobile: CharacterActorSheet available?', !!dnd5e?.applications?.actor?.CharacterActorSheet);
  console.log('5eMobile: Actors.registerSheet available?', !!Actors?.registerSheet);
  console.log('5eMobile: MobileActorSheet5e class?', typeof MobileActorSheet5e);
  
  // Small delay to ensure dnd5e is fully ready
  setTimeout(() => {
    registerMobileSheet();
    autoSwitchToMobileSheet();
    setupUISuppression();
    console.log('5eMobile: Module ready and hooks set up');
  }, 500); // Increased delay to ensure everything is loaded
});

