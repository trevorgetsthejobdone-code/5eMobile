/**
 * 5eMobile WebSocket Support
 * Provides WebSocket connection with polling fallback
 */

import { handleSyncError } from './utils.js';
import { checkServerAvailability } from './sync-core.js';

const MODULE_ID = '5eMobile';

let websocket = null;
let websocketReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

/**
 * Initialize WebSocket connection
 * @param {string} syncUrl - Base URL for sync
 * @param {Function} onMessage - Callback for received messages
 * @returns {Promise<boolean>} True if WebSocket connected, false otherwise
 */
export async function initWebSocket(syncUrl, onMessage) {
  // Check if WebSocket is supported
  if (typeof WebSocket === 'undefined') {
    console.log(`[${MODULE_ID}] WebSocket not supported, using polling fallback`);
    return false;
  }

  try {
    // Convert HTTP URL to WebSocket URL
    const wsUrl = syncUrl.replace(/^http/, 'ws') + '/ws';
    
    websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log(`[${MODULE_ID}] WebSocket connected`);
      websocketReconnectAttempts = 0;
    };
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) {
          onMessage(data);
        }
      } catch (error) {
        handleSyncError(error, {
          actionType: 'websocket-message',
          message: 'Failed to parse WebSocket message'
        });
      }
    };
    
    websocket.onerror = (error) => {
      console.error(`[${MODULE_ID}] WebSocket error:`, error);
    };
    
    websocket.onclose = () => {
      console.log(`[${MODULE_ID}] WebSocket closed`);
      websocket = null;
      
      // Attempt to reconnect
      if (websocketReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        websocketReconnectAttempts++;
        setTimeout(() => {
          initWebSocket(syncUrl, onMessage);
        }, RECONNECT_DELAY);
      } else {
        console.log(`[${MODULE_ID}] Max reconnection attempts reached, falling back to polling`);
      }
    };
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
      
      websocket.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      
      websocket.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket connection failed'));
      };
    });
    
    return true;
  } catch (error) {
    console.log(`[${MODULE_ID}] WebSocket connection failed, using polling fallback:`, error.message);
    return false;
  }
}

/**
 * Send data via WebSocket
 * @param {Object} data - Data to send
 * @returns {boolean} True if sent successfully
 */
export function sendWebSocket(data) {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return false;
  }
  
  try {
    websocket.send(JSON.stringify(data));
    return true;
  } catch (error) {
    handleSyncError(error, {
      actionType: 'websocket-send'
    });
    return false;
  }
}

/**
 * Close WebSocket connection
 */
export function closeWebSocket() {
  if (websocket) {
    websocket.close();
    websocket = null;
  }
}

/**
 * Check if WebSocket is connected
 * @returns {boolean} True if connected
 */
export function isWebSocketConnected() {
  return websocket && websocket.readyState === WebSocket.OPEN;
}

