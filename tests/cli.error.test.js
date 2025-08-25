const { parseArgs } = await import('../src/cli.mjs');

describe('cli unknown args', () => {
  test('throws on unknown flag', () => {
    expect(() => parseArgs(['--nope'])).toThrow(/Unknown argument/);
  });
});
