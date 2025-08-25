import {
  validateOpenAIKey,
  validateMCPServers,
  validateNodeEnvironment,
  validateFileSystem,
  validateNetworkConnectivity,
} from '../src/validator.mjs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jest } from '@jest/globals';

describe('validator.mjs', () => {
  const SAVE = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (SAVE === undefined) { delete process.env.OPENAI_API_KEY; }
    else { process.env.OPENAI_API_KEY = SAVE; }
  });

  test('validateOpenAIKey errors & success', () => {
    // not found
    delete process.env.OPENAI_API_KEY;
    expect(() => validateOpenAIKey()).toThrow(/not found/i);

    // empty
    process.env.OPENAI_API_KEY = '   ';
    expect(() => validateOpenAIKey()).toThrow(/empty/i);

    // bad format
    process.env.OPENAI_API_KEY = 'abc';
    expect(() => validateOpenAIKey()).toThrow(/format invalid/i);

    // good
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(validateOpenAIKey()).toBe(true);
  });

  test('validateMCPServers catches stdio/http issues & unknown type', () => {
    const { errors, warnings } = validateMCPServers({
      a: { type: 'stdio' },                                 // missing fullCommand
      b: { type: 'http', url: 'not-a-url' },                // bad URL
      c: { type: 'weird' },                                 // unknown type -> warning
    });
    expect(errors.join('\n')).toMatch(/missing fullCommand|invalid URL/);
    expect(warnings.join('\n')).toMatch(/unknown type/i);
  });

  test('validateNodeEnvironment returns structured result', () => {
    const res = validateNodeEnvironment();
    expect(res).toHaveProperty('errors');
    expect(res).toHaveProperty('warnings');
  });

  test('validateFileSystem success + error', async () => {
    const ok = join(tmpdir(), `cfg-${Date.now()}.json`);
    await writeFile(ok, '{}', 'utf8');

    const good = validateFileSystem(ok);
    expect(good.errors.length).toBe(0);

    const bad = validateFileSystem('/definitely/not/here.json');
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  test('validateNetworkConnectivity: ok + network error (mock fetch)', async () => {
    const oldFetch = global.fetch;

    global.fetch = jest.fn(async () => ({ ok: true, status: 200 }));
    const ok = await validateNetworkConnectivity({ s1: { type: 'http', url: 'https://example.com' } });
    expect(ok.warnings.length).toBe(0);

    global.fetch = jest.fn(async () => { throw new Error('boom'); });
    const bad = await validateNetworkConnectivity({ s2: { type: 'http', url: 'https://bad.host' } });
    expect(bad.warnings.join('\n')).toMatch(/Network error/i);

    global.fetch = oldFetch;
  });
});
