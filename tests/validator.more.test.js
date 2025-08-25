import { jest } from '@jest/globals';
import { validateNetworkConnectivity, validateSystem } from '../src/validator.mjs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('validateNetworkConnectivity warns on non-OK status', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = jest.fn(async () => ({ ok: false, status: 503 }));
  const out = await validateNetworkConnectivity({ s: { type: 'http', url: 'https://x' } });
  expect(out.warnings.join('\n')).toMatch(/HTTP 503/);
  globalThis.fetch = oldFetch;
});

test('validateSystem returns false when API key invalid', async () => {
  const save = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY; // triggers validateOpenAIKey error

  const cfg = { flow: { steps: [] } }; // minimal JSON to satisfy read
  const p = join(tmpdir(), `ms-${Date.now()}.json`);
  await writeFile(p, JSON.stringify(cfg), 'utf8');

  const ok = await validateSystem(p);
  expect(ok).toBe(false);

  if (save === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = save;
});
