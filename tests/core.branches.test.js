import { jest } from '@jest/globals';

// Flexible mock for @openai/agents so we can swap run impl per test
await jest.unstable_mockModule('@openai/agents', () => {
  let runImpl = async (_agent, history) => ({ finalOutput: { result: 'ok' }, history });
  return {
    Agent: class {
      constructor(opts) { this.opts = opts; }
      asTool({ toolName, toolDescription }) { return { name: toolName, description: toolDescription }; }
    },
    MCPServerStdio: class { constructor(opts) { this.opts = opts; } async connect() {} },
    run: async (agent, history) => runImpl(agent, history),
    withTrace: async (_n, fn) => fn(),
    __setRunImpl: fn => { runImpl = fn; },
  };
});

const agentsMock = await import('@openai/agents');
const core = await import('../src/core.mjs');

describe('core.mjs branch coverage additions', () => {
  beforeAll(() => { process.env.OPENAI_API_KEY = 'sk-test'; });

  test('buildMcpServers http branch and agent tool wiring', async () => {
    const cfg = {
      outputSchemas: {
        basic: { type: 'object', required: ['result'], properties: { result: { type: 'string' } } },
      },
      agents: {
        helper: { outputSchemaRef: 'basic', modelSettings: {}, instructions: 'Helper' },
        writer: {
          outputSchemaRef: 'basic',
          modelSettings: {},
          instructions: 'Writer',
          mcpServerRefs: ['svc'],
          tools: [{ kind: 'agent', ref: 'helper', id: 'helpTool', description: 'helper tool' }],
        },
      },
      mcpServers: { svc: { type: 'http', url: 'http://example.com' } },
      flow: { steps: [{ id: 's1', type: 'single_agent', agentRef: 'writer' }] },
    };

    agentsMock.__setRunImpl(async (_agent, history) => ({ finalOutput: { result: 'ok-tools' }, history }));
    const out = await core.runFlow(cfg, 'ping');
    expect(out).toEqual({ result: 'ok-tools' });
  });

  test('unknown step type throws', async () => {
    const cfg = {
      outputSchemas: { basic: { type: 'object', required: ['result'], properties: { result: { type: 'string' } } } },
      agents: { A: { outputSchemaRef: 'basic', modelSettings: {} } },
      flow: { steps: [{ id: 'x', type: 'weird', agentRef: 'A' }] },
    };
    await expect(core.runFlow(cfg, 'hi')).rejects.toThrow(/Unknown step type/i);
  });

  test('string finalOutput triggers type error', async () => {
    const cfg = {
      outputSchemas: { basic: { type: 'object', required: ['result'], properties: { result: { type: 'string' } } } },
      agents: { A: { outputSchemaRef: 'basic', modelSettings: {} } },
      flow: { steps: [{ id: 's1', type: 'single_agent', agentRef: 'A' }] },
    };
    agentsMock.__setRunImpl(async () => ({ finalOutput: 'oops', history: [] }));
    await expect(core.runFlow(cfg, 'hi')).rejects.toThrow(/required "result"/i);
  });

  test('object without result triggers missing result error', async () => {
    const cfg = {
      outputSchemas: { basic: { type: 'object', required: ['result'], properties: { result: { type: 'string' } } } },
      agents: { A: { outputSchemaRef: 'basic', modelSettings: {} } },
      flow: { steps: [{ id: 's1', type: 'single_agent', agentRef: 'A' }] },
    };
    agentsMock.__setRunImpl(async () => ({ finalOutput: {}, history: [] }));
    await expect(core.runFlow(cfg, 'hi')).rejects.toThrow(/include "result"/i);
  });

  test('agent_reviewer: invalid passCondition hits evalExpr catch; as_system feedback; carryHistory=false', async () => {
    const cfg = {
      outputSchemas: {
        basic: { type: 'object', required: ['result'], properties: { result: { type: 'string' } } },
      },
      agents: {
        proposer: { name: 'Proposer', outputSchemaRef: 'basic', modelSettings: {}, instructions: 'Propose' },
        reviewer: { name: 'Reviewer', outputSchemaRef: 'basic', modelSettings: {}, instructions: 'Review' },
      },
      flow: {
        steps: [{
          id: 'r1', type: 'agent_reviewer', proposalAgentRef: 'proposer', reviewerAgentRef: 'reviewer',
          passCondition: '?invalid', maxTurns: 1, feedbackInjection: 'as_system', io: { carryHistory: false },
        }],
      },
    };

    agentsMock.__setRunImpl(async (agent, history) => {
      if (agent?.opts?.instructions?.includes('Review')) {
        return { finalOutput: { score: 'fail', feedback: 'needs work' }, history };
      }
      return { finalOutput: { result: 'proposal-v1' }, history };
    });

    const out = await core.runFlow(cfg, 'go');
    expect(out).toEqual({ result: 'proposal-v1' });
  });
});
