import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('cli loads --env and runs --setup successfully', async () => {
  const envFile = join(tmpdir(), `ms-env-${Date.now()}.env`);
  await writeFile(envFile, 'OPENAI_API_KEY=sk-from-env\n', 'utf8');

  const res = spawnSync('node', ['src/cli.mjs', `--env=${envFile}`, '--api-key=sk-inline', '--setup'], {
    env: { ...process.env, OPENAI_API_KEY: '' },
    encoding: 'utf8',
  });

  // Show output if it fails (helps debugging locally)
  if (res.status !== 0) {
    // eslint-disable-next-line no-console
    console.error('STDOUT:', res.stdout, '\nSTDERR:', res.stderr);
  }

  expect(res.status).toBe(0);
  expect(res.stdout).toMatch(/Running system setup/i);
  expect(res.stdout).toMatch(/System setup completed/i);
});
