// validator.mjs
// System validation module for multisync parser
import { execSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';

/* ------------------------------ Validation Functions ------------------------------ */

/**
 * Check if OpenAI API key is available in system environment
 */
function validateOpenAIKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not found in system environment');
  }

  if (!process.env.OPENAI_API_KEY.trim()) {
    throw new Error('OPENAI_API_KEY is empty');
  }

  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY format invalid (should start with sk-)');
  }

  return true;
}

/**
 * Check if a command exists in system PATH
 */
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execSync(`where ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Validate MCP server dependencies
 */
function validateMCPServers(mcpConfig) {
  const errors = [];
  const warnings = [];

  for (const [id, cfg] of Object.entries(mcpConfig || {})) {
    const type = cfg.type?.toLowerCase();

    if (type === 'stdio') {
      const command = cfg.fullCommand;
      if (!command) {
        errors.push(`MCP server "${id}": missing fullCommand`);
        continue;
      }

      if (!commandExists(command)) {
        errors.push(
          `MCP server "${id}": command "${command}" not found in system PATH`,
        );
        continue;
      }

      // Check if uvx is available for MCP server packages
      if (command === 'uvx') {
        if (!commandExists('uvx')) {
          errors.push(
            `MCP server "${id}": uvx command not found. Install with: curl -LsSf https://astral.sh/uv/install.sh | sh`,
          );
        } else {
          // Check if the specific MCP server package is available
          const args = cfg.args || [];
          if (args.length > 0) {
            try {
              execSync('uvx --help', { stdio: 'ignore' });
            } catch {
              warnings.push(
                `MCP server "${id}": uvx command found but may not work properly`,
              );
            }
          }
        }
      }
    } else if (type === 'http') {
      try {
        const url = new URL(cfg.url);
        if (!url.protocol.startsWith('http')) {
          errors.push(`MCP server "${id}": invalid URL protocol: ${cfg.url}`);
        }
      } catch {
        errors.push(`MCP server "${id}": invalid URL format: ${cfg.url}`);
      }
    } else {
      warnings.push(`MCP server "${id}": unknown type "${cfg.type}"`);
    }
  }

  return { errors, warnings };
}

/**
 * Validate Node.js environment
 */
function validateNodeEnvironment() {
  const errors = [];
  const warnings = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion < 18) {
    errors.push(
      `Node.js version ${nodeVersion} is too old. Required: 18.x or higher`,
    );
  }

  // Note: In ES modules, built-in modules are always available
  // No need to check for fs, path, child_process, url as they're built-in

  return { errors, warnings };
}

/**
 * Validate file system and permissions
 */
function validateFileSystem(configPath) {
  const errors = [];
  const warnings = [];

  try {
    // Check if config file exists and is readable
    accessSync(configPath, constants.R_OK);
  } catch {
    errors.push(`Configuration file not readable: ${configPath}`);
  }

  // Check working directory permissions
  try {
    accessSync(process.cwd(), constants.W_OK);
  } catch {
    warnings.push(`Working directory not writable: ${process.cwd()}`);
  }

  return { errors, warnings };
}

/**
 * Validate network connectivity for HTTP MCP servers
 */
async function validateNetworkConnectivity(mcpConfig) {
  const errors = [];
  const warnings = [];

  // This is a basic check - in production you might want more sophisticated network testing
  for (const [id, cfg] of Object.entries(mcpConfig || {})) {
    if (cfg.type === 'http') {
      try {
        const response = await fetch(cfg.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        if (!response.ok) {
          warnings.push(
            `MCP server "${id}": HTTP ${response.status} - ${cfg.url}`,
          );
        }
      } catch (error) {
        warnings.push(`MCP server "${id}": Network error - ${error.message}`);
      }
    }
  }

  return { errors, warnings };
}

/* ------------------------------ Main Validation Function ------------------------------ */

/**
 * Main validation function that runs all checks
 */
export async function validateSystem(configPath) {
  console.log('🔍 Starting system validation...\n');

  const allErrors = [];
  const allWarnings = [];

  try {
    // 1. Validate OpenAI API key
    console.log('1️⃣ Checking OpenAI API key...');
    validateOpenAIKey();
    console.log('   ✅ OPENAI_API_KEY found and valid\n');

    // 2. Validate Node.js environment
    console.log('2️⃣ Checking Node.js environment...');
    const nodeValidation = validateNodeEnvironment();
    allErrors.push(...nodeValidation.errors);
    allWarnings.push(...nodeValidation.warnings);

    if (nodeValidation.errors.length === 0) {
      console.log('   ✅ Node.js environment valid\n');
    } else {
      console.log('   ❌ Node.js environment issues found\n');
    }

    // 3. Validate file system
    console.log('3️⃣ Checking file system...');
    const fsValidation = validateFileSystem(configPath);
    allErrors.push(...fsValidation.errors);
    allWarnings.push(...fsValidation.warnings);

    if (fsValidation.errors.length === 0) {
      console.log('   ✅ File system access valid\n');
    } else {
      console.log('   ❌ File system access issues found\n');
    }

    // 4. Load and validate configuration
    console.log('4️⃣ Loading configuration...');
    const { readFile } = await import('node:fs/promises');
    const configRaw = await readFile(configPath, 'utf8');
    const config = JSON.parse(configRaw);
    console.log('   ✅ Configuration loaded successfully\n');

    // 5. Validate MCP servers
    console.log('5️⃣ Checking MCP server dependencies...');
    const mcpValidation = validateMCPServers(config.mcpServers);
    allErrors.push(...mcpValidation.errors);
    allWarnings.push(...mcpValidation.warnings);

    if (mcpValidation.errors.length === 0) {
      console.log('   ✅ MCP server dependencies valid\n');
    } else {
      console.log('   ❌ MCP server dependency issues found\n');
    }

    // 6. Validate network connectivity
    console.log('6️⃣ Checking network connectivity...');
    const networkValidation = await validateNetworkConnectivity(
      config.mcpServers,
    );
    allWarnings.push(...networkValidation.warnings);
    console.log('   ✅ Network connectivity check completed\n');
  } catch (error) {
    allErrors.push(`Validation failed: ${error.message}`);
  }

  // Report results
  console.log('\n📊 Validation Results:');

  if (allWarnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    allWarnings.forEach(warning => console.log(`   • ${warning}`));
  }

  if (allErrors.length > 0) {
    console.log('\n❌ Errors:');
    allErrors.forEach(error => console.log(`   • ${error}`));
    console.log('\n💡 Please fix the above errors before running the parser.');
    return false;
  }

  console.log('\n🎉 All validations passed! System is ready to run.\n');
  return true;
}

/* ------------------------------ Individual Export Functions ------------------------------ */

export {
  validateOpenAIKey,
  validateMCPServers,
  validateNodeEnvironment,
  validateFileSystem,
  validateNetworkConnectivity,
};
