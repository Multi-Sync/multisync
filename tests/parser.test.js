import { jest } from '@jest/globals';
import fs from 'node:fs/promises';

// Mock BEFORE importing core
await jest.unstable_mockModule('@openai/agents', () => {
  let runImpl = async (_agent, history) => {
    const last = [...history].reverse().find(m => m.role === 'user');
    return { finalOutput: { result: `ok:${last?.content ?? ''}` }, history };
  };
  return {
    Agent: class { constructor(opts) { this.opts = opts; } asTool({ toolName }) { return { name: toolName }; } },
    MCPServerStdio: class { async connect() { } },
    run: async (agent, history) => runImpl(agent, history),
    withTrace: async (_n, fn) => fn(),
    __setRunImpl: fn => { runImpl = fn; },
  };
});

const agentsMock = await import('@openai/agents');
const core = await import('../src/core.mjs'); // << use core instead of parser

const reviewerFixtureUrl = new URL('./fixtures/flow.reviewer.json', import.meta.url);

describe('runFlow (reviewer)', () => {
  beforeAll(() => { process.env.OPENAI_API_KEY = 'sk-test'; });

  afterEach(() => {
    agentsMock.__setRunImpl(async (_agent, history) => {
      const last = [...history].reverse().find(m => m.role === 'user');
      return { finalOutput: { result: `ok:${last?.content ?? ''}` }, history };
    });
  });

  test('passes when reviewer returns score=pass', async () => {
    const cfg = JSON.parse(await fs.readFile(reviewerFixtureUrl, 'utf8'));
    let turn = 0;
    agentsMock.__setRunImpl(async (agent, history) => {
      turn++;
      if (agent.opts?.instructions?.includes('Review')) {
        return { finalOutput: { result: 'review-ok', score: 'pass', feedback: 'looks good' }, history };
      }
      return { finalOutput: { result: 'draft' }, history };
    });
    const out = await core.runFlow(cfg, 'Make a plan');
    expect(out).toEqual({ result: 'draft' });
    expect(turn).toBeGreaterThanOrEqual(2);
  });

  test('fails to pass after maxTurns => returns last proposal', async () => {
    const cfg = JSON.parse(await fs.readFile(reviewerFixtureUrl, 'utf8'));
    agentsMock.__setRunImpl(async (agent, history) => {
      if (agent.opts?.instructions?.includes('Review')) {
        return { finalOutput: { result: 'review-bad', score: 'fail', feedback: 'needs work' }, history };
      }
      return { finalOutput: { result: 'proposal-v1' }, history };
    });
    const out = await core.runFlow(cfg, 'Try again');
    expect(out).toEqual({ result: 'proposal-v1' });
  });
});
