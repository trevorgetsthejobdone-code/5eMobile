/**
 * Simple test framework for Foundry VTT modules
 * Provides basic testing utilities
 */

/**
 * Test suite container
 */
const testSuites = [];

/**
 * Describe block for grouping tests
 * @param {string} name - Suite name
 * @param {Function} fn - Test function
 */
export function describe(name, fn) {
  testSuites.push({ name, fn, type: 'describe' });
  fn();
}

/**
 * Individual test case
 * @param {string} name - Test name
 * @param {Function} fn - Test function
 */
export function it(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}:`, error.message);
    throw error;
  }
}

/**
 * Expectation helper
 */
export const expect = (actual) => ({
  toBe: (expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected}, got ${actual}`);
    }
  },
  toBeDefined: () => {
    if (actual === undefined) {
      throw new Error('Expected value to be defined');
    }
  },
  toHaveLength: (length) => {
    if (actual.length !== length) {
      throw new Error(`Expected length ${length}, got ${actual.length}`);
    }
  },
  toContain: (substring) => {
    if (!actual.includes(substring)) {
      throw new Error(`Expected "${actual}" to contain "${substring}"`);
    }
  },
  not: {
    toContain: (substring) => {
      if (actual.includes(substring)) {
        throw new Error(`Expected "${actual}" not to contain "${substring}"`);
      }
    }
  }
});

/**
 * Mock function helper
 */
export function mock(fn) {
  return jest.fn ? jest.fn(fn) : fn;
}

/**
 * Before each hook
 */
export function beforeEach(fn) {
  fn();
}

/**
 * Run all tests
 */
export function runTests() {
  console.log('Running tests...');
  testSuites.forEach(suite => {
    if (suite.type === 'describe') {
      console.log(`\n${suite.name}`);
    }
  });
}

