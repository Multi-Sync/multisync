/**
 * Tests for core.mjs API key enforcement + runFlow.
 */
import { jest } from '@jest/globals';
import fs from 'node:fs/promises';

// Mock @openai/agents for core tests
await jest.unstable_mockModule('@openai/agents', () => ({
  Agent: class { constructor(opts) { this.opts = opts; } },
  MCPServerStdio: class { async connect() { } },
  run: async (_agent, history) => {
    const last = [...history].reverse().find(m => m.role === 'user');
    return { finalOutput: { result: `ok:${last?.content ?? ''}` }, history };
  },
  withTrace: async (_n, fn) => fn(),
}));

// Import module under test (core in src/)
const core = await import('../src/core.mjs');

// Fixture path
const minFixtureUrl = new URL('./fixtures/flow.min.json', import.meta.url);

describe('core.mjs', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    jest.resetModules();
  });

  test('throws if OPENAI_API_KEY missing', async () => {
    const cfg = JSON.parse(await fs.readFile(minFixtureUrl, 'utf8'));
    await expect(core.runFlow(cfg, 'hello')).rejects.toThrow(/OPENAI_API_KEY/);
  });

  test('succeeds when OPENAI_API_KEY is set', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const cfg = JSON.parse(await fs.readFile(minFixtureUrl, 'utf8'));
    const out = await core.runFlow(cfg, 'test prompt');
    expect(out).toHaveProperty('result');
    expect(typeof out.result).toBe('string');
  });

  test('validateConfig delegates and passes valid config', async () => {
    const cfg = JSON.parse(await fs.readFile(minFixtureUrl, 'utf8'));
    expect(() => core.validateConfig(cfg)).not.toThrow();
  });

  test('validateConfig throws on missing flow', async () => {
    const bad = { agents: {}, outputSchemas: {} };
    expect(() => core.validateConfig(bad)).toThrow(/flow/i);
  });
});
