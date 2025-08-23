#!/usr/bin/env node
// Main CLI entry point for multisync
import { validateOpenAIKey, validateNodeEnvironment } from './validator.mjs';
import { runParser } from './parser.mjs';

function showHelp() {
  console.log(`
Usage: multisync [OPTIONS]

Options:
  --setup              Run system setup and validation
  --config=PATH        Configuration file path (required for execution)
  --verbose            Enable verbose logging
  --help               Show this help message

Examples:
  multisync --setup
  multisync --config=test.json
  multisync --config=test.json --verbose
`);
}

export function parseArgs(args) {
  const flags = {};

  for (const arg of args) {
    if (arg === '--help') {
      flags.help = true;
    } else if (arg === '--setup') {
      flags.setup = true;
    } else if (arg === '--verbose') {
      flags.verbose = true;
    } else if (arg.startsWith('--config=')) {
      flags.config = arg.split('=')[1];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return flags;
}

export async function runSetup() {
  console.log('🔧 Running system setup...\n');

  // Run basic system validations
  validateOpenAIKey();
  validateNodeEnvironment();

  console.log('✅ System setup completed successfully!');
  console.log('💡 Next: Run multisync --config=your-config.json');
}

async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      showHelp();
      process.exit(1);
    }

    const flags = parseArgs(args);

    if (flags.help) {
      showHelp();
      return;
    }

    if (flags.setup) {
      await runSetup();
      return;
    }

    if (!flags.config) {
      console.error('❌ Error: --config=PATH is required');
      showHelp();
      process.exit(1);
    }

    // Run parser with config
    await runParser(flags.config, flags.verbose);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
