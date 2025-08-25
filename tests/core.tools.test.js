import { jest } from '@jest/globals';

// mock agents
await jest.unstable_mockModule('@openai/agents', () => ({
  Agent: class { constructor(opts) { this.opts = opts; } asTool() { return { name: 'tool' }; } },
  MCPServerStdio: class { async connect() { } },
  run: async (_agent, history) => ({ finalOutput: { result: 'ok' }, history }),
  withTrace: async (_n, fn) => fn(),
}));

const core = await import('../src/core.mjs');

describe('core tools branch coverage', () => {
  beforeAll(() => { process.env.OPENAI_API_KEY = 'sk-test'; });

  test('handles function and unknown tool kinds (warn paths)', async () => {
    const cfg = {
      outputSchemas: {
        basic: { type: 'object', required: ['result'], properties: { result: { type: 'string' } } },
      },
      agents: {
        A: {
          outputSchemaRef: 'basic',
          tools: [
            { kind: 'function', id: 'noopFn' },         // function branch
            { kind: 'weird', id: 'unknownKind' },       // unknown branch
          ],
        },
      },
      flow: { steps: [{ id: 's1', type: 'single_agent', agentRef: 'A' }] },
    };

    const out = await core.runFlow(cfg, 'ping');
    expect(out).toEqual({ result: 'ok' });
  });
});
