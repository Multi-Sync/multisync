import { jest } from '@jest/globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Mock @openai/agents to avoid real API calls and MCP connections
await jest.unstable_mockModule('@openai/agents', () => ({
  Agent: class {
    constructor(opts) { this.opts = opts; }
    asTool({ toolName, toolDescription }) { return { name: toolName, description: toolDescription }; }
  },
  MCPServerStdio: class {
    constructor(opts) { this.opts = opts; }
    async connect() {}
  },
  run: async (_agent, history) => ({ finalOutput: { result: 'ok:file' }, history }),
  withTrace: async (_n, fn) => fn(),
}));

// Mock openai SDK
const createMock = jest.fn().mockResolvedValue({ id: 'file-123' });
const delMock = jest.fn().mockResolvedValue({});
await jest.unstable_mockModule('openai', () => ({
  OpenAI: class {
    constructor() { this.files = { create: createMock, del: delMock }; }
  },
}));

const core = await import('../src/core.mjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, './fixtures/flow.min.json');

const baseConfig = {
  outputSchemas: {
    basic: {
      type: 'object',
      additionalProperties: false,
      required: ['result'],
      properties: { result: { type: 'string' } },
    },
  },
  agents: {
    writer: {
      name: 'Writer',
      instructions: 'Reply concisely.',
      outputSchemaRef: 'basic',
      modelSettings: {},
    },
  },
  flow: { steps: [{ id: 's1', type: 'single_agent', agentRef: 'writer' }] },
};

describe('core file helpers', () => {
  beforeAll(() => { process.env.OPENAI_API_KEY = 'sk-test'; });
  beforeEach(() => { createMock.mockClear(); delMock.mockClear(); });

  test('runFlowWithFile uploads and deletes by default', async () => {
    const out = await core.runFlowWithFile(baseConfig, fixturePath, 'hello world');
    expect(out).toEqual({ result: 'ok:file', fileId: 'file-123' });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(delMock).toHaveBeenCalledTimes(1);
  });

  test('runFlowWithFile does not delete when deleteFileAfter=false', async () => {
    const out = await core.runFlowWithFile(baseConfig, fixturePath, 'hello', { deleteFileAfter: false });
    expect(out).toEqual({ result: 'ok:file', fileId: 'file-123' });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(delMock).not.toHaveBeenCalled();
  });

  test('runFlowWithFileBuffer uploads from buffer and deletes', async () => {
    // Provide a minimal File shim if not available in the environment
    if (typeof globalThis.File === 'undefined') {
      // eslint-disable-next-line no-global-assign
      globalThis.File = class File { constructor() {} };
    }

    const buffer = Buffer.from('sample content');
    const out = await core.runFlowWithFileBuffer(baseConfig, buffer, 'note.txt', 'hi');
    expect(out).toEqual({ result: 'ok:file', fileId: 'file-123' });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(delMock).toHaveBeenCalledTimes(1);
  });
});
