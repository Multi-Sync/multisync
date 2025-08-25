import { spawnSync } from 'node:child_process';

test('cli with no args prints help and errors (requires config)', () => {
  const res = spawnSync(process.execPath, ['src/cli.mjs'], { encoding: 'utf8' });

  // Expect help text + missing config error
  expect(res.status).toBe(1);
  expect(res.stdout).toMatch(/Usage: multisync/i);
  expect(res.stderr).toMatch(/--config=PATH is required/i);
});
