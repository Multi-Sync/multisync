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
  multisync              # Start interactive mode
  multisync --setup      # Run system setup
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

async function runInteractiveMode() {
  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🚀 Multisync Interactive Mode');
  console.log('Type your questions and press Enter. Type "exit" to quit.\n');

  // Continuous input loop
  async function askQuestion() {
    try {
      const input = await rl.question('> ');

      if (input.toLowerCase().trim() === 'exit') {
        console.log('👋 Goodbye!');
        rl.close();
        return;
      }

      if (input.trim() === '') {
        // Skip empty input, ask again
        askQuestion();
        return;
      }

      // Process the input (you can customize this part)
      console.log(`📝 Processing: "${input}"`);

      // For now, just echo back - you can integrate with your parser here
      console.log(`💬 Response: I received your question: "${input}"\n`);

      // Ask for next question (recursive call)
      askQuestion();

    } catch (error) {
      console.error(`❌ Error processing input: ${error.message}`);
      // Continue asking questions even if there's an error
      askQuestion();
    }
  }

  // Start the continuous loop
  askQuestion();
}

async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      // No arguments - start interactive mode
      await runInteractiveMode();
      return;
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
