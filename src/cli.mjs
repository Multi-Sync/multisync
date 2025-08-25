#!/usr/bin/env node
import { validateOpenAIKey, validateNodeEnvironment } from './validator.mjs';
import { runParser } from './parser.mjs';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function showHelp() {
  console.log(`
Usage: multisync [OPTIONS]
  --setup                 Run system setup and validation
  --config=PATH           Configuration file path
  --api-key=KEY           OpenAI API key
  --env=PATH              Load .env file
  --verbose               Enable verbose logging
  --help                  Show this help message
`);
}

function parseArgs(args) {
  const flags = {};
  for (const arg of args) {
    if (arg === '--help') { flags.help = true; }
    else if (arg === '--setup') { flags.setup = true; }
    else if (arg === '--verbose') { flags.verbose = true; }
    else if (arg.startsWith('--config=')) { flags.config = arg.split('=')[1]; }
    else if (arg.startsWith('--api-key=')) { flags.apiKey = arg.slice('--api-key='.length); } // <-- add
    else if (arg.startsWith('--env=')) { flags.env = arg.slice('--env='.length); }           // <-- add
    else { throw new Error(`Unknown argument: ${arg}`); }
  }
  return flags;
}

async function runSetup({ apiKey }) {
  console.log('🔧 Running system setup...\n');
  if (apiKey) { process.env.OPENAI_API_KEY = apiKey; }
  validateOpenAIKey();
  validateNodeEnvironment();
  console.log('✅ System setup completed successfully!');
  console.log('💡 Next: multisync --config=your-config.json');
}

async function main() {
  try {
    const flags = parseArgs(process.argv.slice(2));

    if (flags.help) { return showHelp(); }

    if (flags.env) {
      const envData = await fs.readFile(flags.env, 'utf8');
      for (const line of envData.split(/\r?\n/)) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (m) { process.env[m[1]] = m[2]; }
      }
    }
    if (flags.apiKey) { process.env.OPENAI_API_KEY = flags.apiKey; }

    if (flags.setup) { return runSetup({ apiKey: flags.apiKey }); }

    if (!flags.config) {
      console.error('❌ Error: --config=PATH is required');
      showHelp();
      process.exit(1);
    }

    await runParser(flags.config, flags.verbose, { apiKey: flags.apiKey });
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { showHelp, main, parseArgs };