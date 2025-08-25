import { jest } from '@jest/globals';
import fs from 'node:fs/promises';

// 1) Mock validator to always pass
await jest.unstable_mockModule('../src/validator.mjs', () => ({
  validateSystem: async () => true,
}));

// 2) Mock readline to return one prompt then exit
const answers = ['hello world', 'exit'];
await jest.unstable_mockModule('node:readline/promises', () => ({
  default: {
    createInterface: () => ({
      question: async () => answers.shift(),
      close: () => { },
    }),
  },
}));

// 3) Mock @openai/agents so a run returns a valid finalOutput
await jest.unstable_mockModule('@openai/agents', () => ({
  Agent: class { constructor(opts) { this.opts = opts; } },
  MCPServerStdio: class { async connect() { } },
  run: async (_agent, history) => {
    const last = [...history].reverse().find(m => m.role === 'user');
    return { finalOutput: { result: `ok:${last?.content ?? ''}` }, history };
  },
  withTrace: async (_n, fn) => fn(),
}));

const parser = await import('../src/parser.mjs');

const cfgUrl = new URL('./fixtures/flow.min.json', import.meta.url);

describe('parser.mjs runParser loop', () => {
  beforeAll(() => { process.env.OPENAI_API_KEY = 'sk-test'; });

  test('runs a prompt then exits cleanly', async () => {
    // ensure fixture exists (also bumps FS paths in coverage)
    const raw = await fs.readFile(cfgUrl, 'utf8');
    expect(JSON.parse(raw).flow.steps.length).toBeGreaterThan(0);

    // should process first prompt, then see "exit"
    await parser.runParser(new URL(cfgUrl).pathname, false);
  });
});
