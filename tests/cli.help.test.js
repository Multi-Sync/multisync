// cli.help.test.js
import { jest } from '@jest/globals';

const cli = await import('../src/cli.mjs');

describe('cli.mjs help', () => {
  test('showHelp prints options', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => { });
    cli.showHelp();

    const out = spy.mock.calls.map(a => a.join(' ')).join('\n');
    expect(out).toMatch(/--config/);
    expect(out).toMatch(/--api-key/);
    expect(out).toMatch(/--env/);
    expect(out).toMatch(/--setup/);

    spy.mockRestore();
  });
});
