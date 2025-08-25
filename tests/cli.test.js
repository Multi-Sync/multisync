//cli.test.js
// Import CLI (at repo root)
const cli = await import('../src/cli.mjs');

describe('cli.mjs parseArgs & key checks', () => {
  test('parseArgs parses flags correctly', () => {
    const flags = cli.parseArgs([
      '--config=./flows/a.json',
      '--setup',
      '--verbose',
      '--api-key=sk-abc',
      '--env=.env.local',
    ]);
    expect(flags).toMatchObject({
      config: './flows/a.json',
      setup: true,
      verbose: true,
      apiKey: 'sk-abc',
      env: '.env.local',
    });
  });

  test('API key check helper (simulate CLI preflight)', () => {
    const OLD = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const needKey = () => {
      if (!process.env.OPENAI_API_KEY) { throw new Error('OPENAI_API_KEY is required'); }
    };
    expect(needKey).toThrow(/OPENAI_API_KEY/);

    process.env.OPENAI_API_KEY = OLD || 'sk-test';
    expect(needKey).not.toThrow();
  });
});
