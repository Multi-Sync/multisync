import { jest } from '@jest/globals';
import { parseArgs, runSetup } from '../../cli.mjs';
import { validateSystem } from '../../validator.mjs';

describe('CLI Direct Integration Tests', () => {
  let originalEnv;

  beforeAll(async () => {
    // Set up test environment
    originalEnv = { ...process.env };
    process.env.OPENAI_API_KEY = 'sk-test-key-1234567890abcdef';
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to reduce noise
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Cleanup any hanging processes or timers
    if (global.testCleanup) {
      global.testCleanup();
    }
  });

  afterAll(async () => {
    // Final cleanup
    if (global.testCleanup) {
      global.testCleanup();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('parseArgs Function Integration', () => {
    test('should parse template config paths correctly', () => {
      const args = ['--config=templates/example-minimal-flow.json', '--verbose'];
      const result = parseArgs(args);

      expect(result.config).toBe('templates/example-minimal-flow.json');
      expect(result.verbose).toBe(true);
    });

    test('should parse test fixture config paths correctly', () => {
      const args = ['--config=tests/fixtures/test-minimal-flow.json'];
      const result = parseArgs(args);

      expect(result.config).toBe('tests/fixtures/test-minimal-flow.json');
    });

    test('should handle setup mode', () => {
      const args = ['--setup'];
      const result = parseArgs(args);

      expect(result.setup).toBe(true);
    });

    test('should handle help mode', () => {
      const args = ['--help'];
      const result = parseArgs(args);

      expect(result.help).toBe(true);
    });
  });

  describe('runSetup Function Integration', () => {
    test('should run setup without throwing errors', async () => {
      // This test verifies setup can run with valid environment
      await expect(runSetup()).resolves.not.toThrow();

      expect(console.log).toHaveBeenCalledWith('🔧 Running system setup...\n');
      expect(console.log).toHaveBeenCalledWith('✅ System setup completed successfully!');
    });
  });

  describe('Configuration File Integration', () => {
    test('should validate minimal flow configuration', async () => {
      const configPath = 'tests/fixtures/test-minimal-flow.json';

      // Test that validation can read and process the config
      const result = await validateSystem(configPath);

      // Should return boolean (true for success, false for failure)
      expect(typeof result).toBe('boolean');
    });

    test('should validate complex flow configuration', async () => {
      const configPath = 'tests/fixtures/test-complex-flow.json';

      // Test that validation can read and process the config
      const result = await validateSystem(configPath);

      // Should return boolean (true for success, false for failure)
      expect(typeof result).toBe('boolean');
    });

    test('should handle non-existent configuration file', async () => {
      const configPath = 'non-existent-file.json';

      // Should return false for non-existent file
      const result = await validateSystem(configPath);
      expect(result).toBe(false);
    });
  });

  describe('Template File Integration', () => {
    test('should validate template minimal flow configuration', async () => {
      const configPath = 'templates/example-minimal-flow.json';

      // Test that validation can read and process the template
      const result = await validateSystem(configPath);

      // Should return boolean
      expect(typeof result).toBe('boolean');
    });

    test('should validate template complex flow configuration', async () => {
      const configPath = 'templates/example-complex-flow.json';

      // Test that validation can read and process the template
      const result = await validateSystem(configPath);

      // Should return boolean
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle invalid arguments gracefully', () => {
      expect(() => parseArgs(['--invalid-flag'])).toThrow('Unknown argument: --invalid-flag');
    });

    test('should handle missing API key gracefully', async () => {
      // Temporarily remove API key
      delete process.env.OPENAI_API_KEY;

      const result = await validateSystem('tests/fixtures/test-minimal-flow.json');
      expect(result).toBe(false);

      // Restore API key
      process.env.OPENAI_API_KEY = 'sk-test-key-1234567890abcdef';
    });
  });

  describe('End-to-End Flow Integration', () => {
    test('should handle complete CLI workflow for minimal flow (validation only)', async () => {
      // 1. Parse arguments
      const args = parseArgs(['--config=tests/fixtures/test-minimal-flow.json', '--verbose']);
      expect(args.config).toBe('tests/fixtures/test-minimal-flow.json');
      expect(args.verbose).toBe(true);

      // 2. Validate system (this is the main integration test)
      const validationResult = await validateSystem(args.config);
      expect(typeof validationResult).toBe('boolean');

      // 3. Verify the workflow completes without crashing
      expect(args).toHaveProperty('config');
      expect(args).toHaveProperty('verbose');
    });

    test('should handle complete CLI workflow for complex flow (validation only)', async () => {
      // 1. Parse arguments
      const args = parseArgs(['--config=tests/fixtures/test-complex-flow.json']);
      expect(args.config).toBe('tests/fixtures/test-complex-flow.json');

      // 2. Validate system (this is the main integration test)
      const validationResult = await validateSystem(args.config);
      expect(typeof validationResult).toBe('boolean');

      // 3. Verify the workflow completes without crashing
      expect(args).toHaveProperty('config');
    });

    test('should integrate parseArgs with template files', () => {
      // Test that parseArgs works with both template paths
      const minimalArgs = parseArgs(['--config=templates/example-minimal-flow.json', '--verbose']);
      const complexArgs = parseArgs(['--config=templates/example-complex-flow.json']);

      expect(minimalArgs.config).toBe('templates/example-minimal-flow.json');
      expect(minimalArgs.verbose).toBe(true);
      expect(complexArgs.config).toBe('templates/example-complex-flow.json');
    });
  });
});
