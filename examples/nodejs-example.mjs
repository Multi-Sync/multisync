// examples/embed.ts
import { runFlow, validateConfig } from '../src/core.mjs';
import { promises as fs } from 'fs';

async function runAgents({ configPath, prompt, apiKey }) {
  const raw = await fs.readFile(configPath, 'utf8');
  const config = JSON.parse(raw);
  validateConfig(config);
  const result = await runFlow(config, prompt, { apiKey });
  return result;
}

// Usage
(async () => {
  const out = await runAgents({
    configPath: './examples/dry-run.json',
    prompt: 'Hello, world!',
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log(out);
})();
