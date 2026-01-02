/**
 * 5eMobile Offline Action Queue
 * Queues actions when Electron app is unavailable
 */

const MODULE_ID = '5eMobile';
const QUEUE_STORAGE_KEY = '5eMobile_actionQueue';
const MAX_QUEUE_SIZE = 100;

/**
 * Get action queue from storage
 * @returns {Array} Array of queued actions
 */
function getActionQueue() {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error(`[${MODULE_ID}] Error reading action queue:`, error);
    return [];
  }
}

/**
 * Save action queue to storage
 * @param {Array} queue - Array of actions to save
 */
function saveActionQueue(queue) {
  try {
    // Limit queue size
    const limitedQueue = queue.slice(-MAX_QUEUE_SIZE);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(limitedQueue));
  } catch (error) {
    console.error(`[${MODULE_ID}] Error saving action queue:`, error);
  }
}

/**
 * Add action to queue
 * @param {Object} action - Action to queue
 */
export function queueAction(action) {
  const queue = getActionQueue();
  queue.push({
    ...action,
    queuedAt: Date.now()
  });
  saveActionQueue(queue);
}

/**
 * Get queued actions
 * @returns {Array} Array of queued actions
 */
export function getQueuedActions() {
  return getActionQueue();
}

/**
 * Clear action queue
 */
export function clearActionQueue() {
  localStorage.removeItem(QUEUE_STORAGE_KEY);
}

/**
 * Remove action from queue by index
 * @param {number} index - Index of action to remove
 */
export function removeQueuedAction(index) {
  const queue = getActionQueue();
  queue.splice(index, 1);
  saveActionQueue(queue);
}

/**
 * Get queue size
 * @returns {number} Number of queued actions
 */
export function getQueueSize() {
  return getActionQueue().length;
}

