import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jest } from '@jest/globals';

test('validateSystem passes with good key + HTTP MCP', async () => {
  const { validateSystem } = await import('../src/validator.mjs');

  const cfgPath = join(tmpdir(), `ms-cfg-${Date.now()}.json`);
  const cfg = {
    flow: { steps: [] },
    mcpServers: { s1: { type: 'http', url: 'https://example.com' } },
  };
  await writeFile(cfgPath, JSON.stringify(cfg), 'utf8');

  const save = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'sk-ok';

  const oldFetch = globalThis.fetch;
  globalThis.fetch = jest.fn(async () => ({ ok: true, status: 200 }));

  const ok = await validateSystem(cfgPath);
  expect(ok).toBe(true);

  globalThis.fetch = oldFetch;
  if (save === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = save;
});
