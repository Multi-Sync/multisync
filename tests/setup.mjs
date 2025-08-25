// Test setup file for Jest with ES module support
import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(10000);

// Mock process.exit to prevent tests from actually exiting
const originalExit = process.exit;
process.exit = jest.fn();

// Mock fetch for network tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  }),
);

// Mock AbortSignal
global.AbortSignal = {
  timeout: jest.fn(() => ({})),
};

// Track timers for cleanup
const activeTimers = new Set();
const activeIntervals = new Set();

// Override setTimeout to track timers
const originalSetTimeout = global.setTimeout;
global.setTimeout = (fn, delay, ...args) => {
  const id = originalSetTimeout(fn, delay, ...args);
  activeTimers.add(id);
  return id;
};

// Override setInterval to track intervals
const originalSetInterval = global.setInterval;
global.setInterval = (fn, delay, ...args) => {
  const id = originalSetInterval(fn, delay, ...args);
  activeIntervals.add(id);
  return id;
};

// Override clearTimeout to remove from tracking
const originalClearTimeout = global.clearTimeout;
global.clearTimeout = id => {
  activeTimers.delete(id);
  return originalClearTimeout(id);
};

// Override clearInterval to remove from tracking
const originalClearInterval = global.clearInterval;
global.clearInterval = id => {
  activeIntervals.delete(id);
  return originalClearInterval(id);
};

// Global cleanup function
global.testCleanup = () => {
  // Clear all tracked timers
  activeTimers.forEach(id => {
    originalClearTimeout(id);
  });
  activeTimers.clear();

  // Clear all tracked intervals
  activeIntervals.forEach(id => {
    originalClearInterval(id);
  });
  activeIntervals.clear();

  // Reset mocks
  jest.clearAllMocks();

  // Restore process.exit if needed
  if (originalExit && process.exit !== originalExit) {
    process.exit = originalExit;
  }
};

// Run cleanup after each test
afterEach(() => {
  if (global.testCleanup) {
    global.testCleanup();
  }
});

// Run cleanup after all tests
afterAll(() => {
  if (global.testCleanup) {
    global.testCleanup();
  }
});
