// parser.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { runFlow, validateConfig, ensureOpenAIKey } from './core.mjs';
import { validateSystem } from './validator.mjs';

export async function runPromptLoop(config, { apiKey } = {}) {
  ensureOpenAIKey(apiKey);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('Type your prompt and press Enter. Type "exit" to quit.');
    while (true) {
      const userPrompt = (await rl.question('> ')).trim();
      if (!userPrompt) { continue; }
      const cmd = userPrompt.toLowerCase();
      if (['exit', 'quit', ':q'].includes(cmd)) { break; }
      const out = await runFlow(config, userPrompt);
      console.log(JSON.stringify(out));
    }
  } finally {
    rl.close();
  }
}

export async function runParser(configPath, verbose = false, { apiKey } = {}) {
  // Normalize configPath to a proper filesystem path.
  // Handles cases where tests pass URL.pathname on Windows (e.g. "/D:/...").
  let cfgPath = configPath;
  try {
    if (typeof cfgPath === 'string' && cfgPath.startsWith('file:')) {
      cfgPath = fileURLToPath(new URL(cfgPath));
    } else if (typeof cfgPath === 'string' && process.platform === 'win32' && /^\/[A-Za-z]:\//.test(cfgPath)) {
      // Drop the leading slash from URL.pathname-style Windows paths
      cfgPath = cfgPath.slice(1);
    }
  } catch {
    // If any conversion fails, fall back to the original value
  }
  const configPathResolved = path.isAbsolute(cfgPath) ? cfgPath : path.resolve(process.cwd(), cfgPath);
  console.log('🚀 Starting multisync parser...');
  const validationPassed = await validateSystem(configPathResolved, { apiKey });
  if (!validationPassed) { process.exit(1); }

  const configRaw = await fs.readFile(configPathResolved, 'utf8');
  const config = JSON.parse(configRaw);
  validateConfig(config);

  await runPromptLoop(config, { apiKey });
}
