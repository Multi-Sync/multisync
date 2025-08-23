// run-flow.mjs
// Usage: node run-flow.mjs <configPath> <flowId>
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { Agent, MCPServerStdio, run, withTrace } from '@openai/agents';
import { z } from 'zod';
import { validateSystem } from './validator.mjs';


/* ------------------------------ Small helpers ------------------------------ */

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const warn = (...a) => console.warn('[warn]', ...a);
const die = (msg, code = 1) => { console.error(msg); process.exit(code); };

function assert(cond, msg) { if (!cond) die(msg); }

/** Minimal JSON-Schema → zod converter (covers common cases used here). */
function jsonSchemaToZod(schema) {
  if (!schema) return z.any();

  // Simple primitives
  if (schema.type === 'string') {
    return schema.enum ? z.enum(schema.enum) : z.string();
  }
  if (schema.type === 'number' || schema.type === 'integer') return z.number();
  if (schema.type === 'boolean') return z.boolean();

  // Arrays
  if (schema.type === 'array') {
    const item = jsonSchemaToZod(schema.items || {});
    return z.array(item);
  }

  // Objects
  if (schema.type === 'object' || schema.properties) {
    const shape = {};
    const req = new Set(schema.required || []);
    for (const [k, v] of Object.entries(schema.properties || {})) {
      let zf = jsonSchemaToZod(v);
      if (!req.has(k)) zf = zf.optional();
      shape[k] = zf;
    }
    let obj = z.object(shape);
    if (schema.additionalProperties === false) {
      // zod doesn't hard-block unknown keys unless we use strict()
      obj = obj.strict();
    }
    return obj;
  }

  // Fallback
  return z.any();
}

/** Very small expression evaluator for pass/fail checks. */
function evalExpr(expr, ctx) {
  // Supports simple expressions like: score == 'pass'  or turn < maxTurns
  // This is a local utility script; if you need hardened evaluation, swap this out.
  try {
    // Create a sandboxed function with only the ctx keys in scope.
    const fn = new Function(...Object.keys(ctx), `return (${expr});`);
    return fn(...Object.values(ctx));
  } catch (e) {
    warn('Failed to evaluate expression:', expr, e.message);
    return false;
  }
}

/* ------------------------------ Logging & Colors ------------------------------ */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Color palette for agents
const agentColors = [
  colors.cyan,
  colors.magenta,
  colors.yellow,
  colors.green,
  colors.blue,
  colors.red
];

let verboseMode = false;
let agentColorMap = new Map();

function log(agentId, message, type = 'info') {
  if (!verboseMode) return;

  const color = agentColorMap.get(agentId) || colors.white;
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';

  console.log(`${color}[${timestamp}] ${agentId}${colors.reset} ${prefix} ${message}`);
}

function logSystem(message, type = 'info') {
  if (!verboseMode) return;

  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';

  console.log(`${colors.bright}[${timestamp}] SYSTEM${colors.reset} ${prefix} ${message}`);
}

/* ------------------------------ Configuration Validation ------------------------------ */

function validateConfig(config) {
  logSystem('Starting configuration validation...');

  // Check for single flow (no flows property)
  if (!config.flow) {
    throw new Error('Configuration must contain a "flow" property');
  }
  logSystem('✓ Flow property found');

  // Validate flow structure
  const flow = config.flow;
  if (!flow.steps || flow.steps.length < 1) {
    throw new Error('Flow must contain at least one step');
  }
  logSystem(`✓ Flow structure valid (${flow.steps.length} steps)`);

  // Validate ALL output schemas have required result property
  const schemaCount = Object.keys(config.outputSchemas || {}).length;
  logSystem(`Validating ${schemaCount} output schemas...`);

  for (const [name, schema] of Object.entries(config.outputSchemas || {})) {
    if (!schema.properties?.result) {
      throw new Error(`Output schema "${name}" must have "result" property`);
    }
    if (!schema.required?.includes('result')) {
      throw new Error(`Output schema "${name}" must have required "result" property`);
    }
    logSystem(`✓ Schema "${name}" validated`);
  }

  // Validate ALL agents have outputSchemaRef
  const agentCount = Object.keys(config.agents || {}).length;
  logSystem(`Validating ${agentCount} agents...`);

  for (const [id, agent] of Object.entries(config.agents || {})) {
    if (!agent.outputSchemaRef) {
      throw new Error(`Agent "${id}" must have "outputSchemaRef" property`);
    }
    if (!config.outputSchemas?.[agent.outputSchemaRef]) {
      throw new Error(`Agent "${id}" references unknown output schema "${agent.outputSchemaRef}"`);
    }
    logSystem(`✓ Agent "${id}" validated (schema: ${agent.outputSchemaRef})`);
  }

  logSystem('✓ Configuration validation completed successfully');
}

/* ------------------------------ Output Standardization ------------------------------ */

function standardizeOutput(output) {
  if (!output) {
    throw new Error('Output cannot be null or undefined');
  }

  if (typeof output === 'string') {
    throw new Error('String outputs are not allowed, it should be a JSON object and must have "result" property');
  }

  if (!output.result) {
    throw new Error('Output must have "result" property');
  }

  return output; // Only return if it has result property
}

/* ------------------------------ Builders ----------------------------------- */

async function buildMcpServers(mcpConfig) {
  /** @type {Record<string, any>} */
  const mcp = {};
  /** @type {Array<Promise<any>>} */
  const connects = [];

  for (const [id, cfg] of Object.entries(mcpConfig || {})) {
    const type = cfg.type?.toLowerCase();
    if (type === 'stdio') {
      const full = [cfg.fullCommand, ...(cfg.args || [])].filter(Boolean).join(' ');
      logSystem(`Connecting to MCP stdio server: ${id} (${full})`);

      const srv = new MCPServerStdio({
        name: cfg.name || id,
        fullCommand: full
      });
      mcp[id] = srv;
      connects.push(srv.connect().catch(err => {
        logSystem(`Failed to connect MCP stdio server "${id}": ${err?.message || err}`, 'error');
        die(`Failed to connect MCP stdio server "${id}": ${err?.message || err}`);
      }));
    } else if (type === 'http') {
      logSystem(`Connecting to MCP HTTP server: ${id} (${cfg.url})`);
      // Agents SDK accepts an MCP URL directly inside agent.mcpServers
      mcp[id] = cfg.url;
    } else {
      logSystem(`Unknown MCP type for "${id}": ${cfg.type}. Skipping.`, 'warn');
      warn(`Unknown MCP type for "${id}": ${cfg.type}. Skipping.`);
    }
  }

  await Promise.all(connects);
  logSystem(`Successfully connected to ${Object.keys(mcp).length} MCP servers`);
  return mcp;
}

/**
 * Build agents in two passes:
 *  - base pass: create agents WITHOUT tools
 *  - tools pass: create final agents WITH tools (agent-as-tool supported)
 */
function buildAgents(agentsConfig, mcpRegistry, outputSchemas) {
  /** @type {Record<string, Agent>} */
  const baseAgents = {};
  /** @type {Record<string, any>} */
  const raw = agentsConfig || {};

  logSystem(`Building ${Object.keys(raw).length} agents...`);

  // Pass A: base agents (no tools)
  for (const [id, a] of Object.entries(raw)) {
    if (!a.outputSchemaRef) {
      throw new Error(`Agent "${id}" must have outputSchemaRef`);
    }

    const outputType = outputSchemas[a.outputSchemaRef];
    if (!outputType) {
      throw new Error(`Agent "${id}" references unknown output schema "${a.outputSchemaRef}"`);
    }

    // Convert JSON schema to Zod if needed
    const zodSchema = jsonSchemaToZod(outputType);

    const mcpRefs = (a.mcpServerRefs || []).map(ref => {
      const srv = mcpRegistry[ref];
      if (!srv) {
        log(id, `References unknown MCP "${ref}"`, 'warn');
        warn(`Agent "${id}" references unknown MCP "${ref}"`);
      }
      return srv;
    }).filter(Boolean);

    log(id, `Creating base agent with ${mcpRefs.length} MCP servers`);

    baseAgents[id] = new Agent({
      name: a.name || id,
      instructions: a.instructions || '',
      outputType: zodSchema, // Always use the schema
      modelSettings: a.modelSettings || {},
      mcpServers: mcpRefs
    });
  }

  // Pass B: with tools (agent tools; function tools are warned/stubbed)
  /** @type {Record<string, Agent>} */
  const finalAgents = {};
  for (const [id, a] of Object.entries(raw)) {
    // Build tools
    const tools = [];
    for (const t of (a.tools || [])) {
      if (t.kind === 'agent') {
        const target = baseAgents[t.ref];
        if (!target) {
          log(id, `Tool references unknown agent "${t.ref}"`, 'warn');
          warn(`Agent "${id}" tool references unknown agent "${t.ref}"`);
          continue;
        }
        log(id, `Adding agent tool: ${t.id || t.ref}`);
        tools.push(target.asTool({
          toolName: t.id || t.ref,
          toolDescription: t.description || `Tool for agent ${t.ref}`
        }));
      } else if (t.kind === 'function') {
        // If you want actual function tools, replace this with a real tool impl.
        log(id, `Function tool "${t.id}" declared but not implemented`, 'warn');
        warn(`Agent "${id}" declares function tool "${t.id}". Stub only—no-op.`);
        continue;
      } else {
        log(id, `Tool "${t.id}" has unknown kind "${t.kind}"`, 'warn');
        warn(`Agent "${id}" tool "${t.id}" has unknown kind "${t.kind}".`);
      }
    }

    const outputType = outputSchemas[a.outputSchemaRef];
    if (!outputType) {
      throw new Error(`Agent "${id}" references unknown output schema "${a.outputSchemaRef}"`);
    }

    const zodSchema = jsonSchemaToZod(outputType);
    const mcpRefs = (a.mcpServerRefs || []).map(ref => mcpRegistry[ref]).filter(Boolean);

    log(id, `Creating final agent with ${tools.length} tools and ${mcpRefs.length} MCP servers`);

    finalAgents[id] = new Agent({
      name: a.name || id,
      instructions: a.instructions || '',
      outputType: zodSchema, // Always use the schema
      modelSettings: a.modelSettings || {},
      mcpServers: mcpRefs,
      tools
    });
  }

  logSystem(`Successfully built ${Object.keys(finalAgents).length} agents`);
  return finalAgents;
}

/* ------------------------------ Executors ---------------------------------- */

async function execSingleAgent(agent, history, carryHistory = true) {
  log(agent.name || 'unknown', `Running with ${history.length} history messages, carryHistory: ${carryHistory}`);

  const res = await run(agent, history);
  let nextHistory = history;
  if (carryHistory) nextHistory = res.history || history;

  log(agent.name || 'unknown', `Completed, output: ${res.finalOutput ? 'present' : 'null'}, history: ${nextHistory.length} messages`);
  return { finalOutput: res.finalOutput, history: nextHistory };
}

async function execAgentReviewer(proposalAgent, reviewerAgent, history, {
  passCondition = "score == 'pass'",
  maxTurns = 8,
  feedbackInjection = 'as_user',
  carryHistory = true
}) {
  log(proposalAgent.name || 'unknown', `Starting review loop (max ${maxTurns} turns, pass condition: ${passCondition})`);

  let turn = 0;
  let lastProposal = null;
  let nextHistory = history;

  while (turn < maxTurns) {
    turn++;
    log(proposalAgent.name || 'unknown', `Turn ${turn}/${maxTurns}: Generating proposal`);

    const prop = await run(proposalAgent, nextHistory);
    lastProposal = prop.finalOutput ?? null;
    if (carryHistory) nextHistory = prop.history || nextHistory;

    log(reviewerAgent.name || 'unknown', `Turn ${turn}/${maxTurns}: Reviewing proposal`);
    const rev = await run(reviewerAgent, nextHistory);
    const review = rev.finalOutput || {};
    if (carryHistory) nextHistory = rev.history || nextHistory;

    const ctx = { ...review, turn, maxTurns };
    const pass = evalExpr(passCondition, ctx);

    log(reviewerAgent.name || 'unknown', `Turn ${turn}/${maxTurns}: Evaluation result - ${pass ? 'PASS' : 'FAIL'}`);

    if (pass) {
      log(proposalAgent.name || 'unknown', `Review loop completed successfully in ${turn} turns`);
      return { finalOutput: lastProposal, history: nextHistory, passed: true };
    }

    // Inject feedback for next iteration
    const fb = review?.feedback ?? JSON.stringify(review);
    if (feedbackInjection === 'as_system') {
      nextHistory = [...nextHistory, { role: 'system', content: `Feedback: ${fb}` }];
    } else if (feedbackInjection === 'append_only') {
      // no-op: iteration without message injection
    } else {
      // default 'as_user'
      nextHistory = [...nextHistory, { role: 'user', content: `Feedback: ${fb}` }];
    }

    if (turn < maxTurns) {
      log(proposalAgent.name || 'unknown', `Turn ${turn}/${maxTurns}: Injecting feedback for next iteration`);
    }
  }

  log(proposalAgent.name || 'unknown', `Review loop completed after ${maxTurns} turns without passing`);
  return { finalOutput: lastProposal, history: nextHistory, passed: false };
}

/* ------------------------------ Flow Runner -------------------------------- */

async function runFlow(config, userPrompt) {
  const flow = config.flow;
  assert(flow, 'Flow not found in configuration');

  logSystem(`Starting flow execution with ${flow.steps.length} steps`);

  // Build infra
  const mcpRegistry = await buildMcpServers(config.mcpServers || {});
  const agents = buildAgents(config.agents || {}, mcpRegistry, config.outputSchemas || {});

  // Seed history
  let history = [{ role: 'user', content: userPrompt }];

  // Process steps sequentially
  let currentOutput = null;

  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];
    logSystem(`Executing step ${i + 1}/${flow.steps.length}: ${step.type} (${step.id})`);

    if (step.type === 'single_agent') {
      const agent = agents[step.agentRef];
      assert(agent, `Agent "${step.agentRef}" not found.`);

      log(step.agentRef, `Starting execution`);
      const { finalOutput: out, history: h } = await execSingleAgent(agent, history, step.io?.carryHistory !== false);
      currentOutput = out;
      history = h;
      log(step.agentRef, `Execution completed`);

    } else if (step.type === 'agent_reviewer') {
      const proposal = agents[step.proposalAgentRef];
      const reviewer = agents[step.reviewerAgentRef];
      assert(proposal, `Proposal agent "${step.proposalAgentRef}" not found.`);
      assert(reviewer, `Reviewer agent "${step.reviewerAgentRef}" not found.`);

      log(step.proposalAgentRef, `Starting proposal generation`);
      log(step.reviewerAgentRef, `Starting review process`);

      const { finalOutput: out, history: h, passed } = await execAgentReviewer(
        proposal,
        reviewer,
        history,
        {
          passCondition: step.passCondition || "score == 'pass'",
          maxTurns: typeof step.maxTurns === 'number' ? step.maxTurns : 8,
          feedbackInjection: step.feedbackInjection || 'as_user',
          carryHistory: step.io?.carryHistory !== false
        }
      );
      currentOutput = out;
      history = h;

      log(step.proposalAgentRef, `Proposal completed`);
      log(step.reviewerAgentRef, `Review completed - ${passed ? 'PASSED' : 'FAILED'}`);

      // Note: We continue to next step regardless of pass/fail
      // If you want to stop on failure, add logic here

    } else {
      die(`Unknown step type "${step.type}" at step ${i + 1}.`);
    }
  }

  // Standardize and return the final output
  if (currentOutput !== null && currentOutput !== undefined) {
    try {
      logSystem(`Standardizing output...`);
      const standardized = standardizeOutput(currentOutput);
      logSystem(`Output validation successful`);
      console.log(JSON.stringify(standardized));
      return standardized;
    } catch (error) {
      logSystem(`Output validation failed: ${error.message}`, 'error');
      die(`Output validation failed: ${error.message}`);
    }
  } else {
    // No output from any step
    logSystem(`No output generated, returning empty result`);
    console.log(JSON.stringify({ result: "" }));
    return { result: "" };
  }
}
/* --------------------------------- Main ------------------------------------ */

// Export the main function for CLI usage
export async function runParser(configPath, verbose = false) {
  try {
    const configPathResolved = path.resolve(process.cwd(), configPath);

    // Run system validation before proceeding
    console.log('🚀 Starting multisync parser...\n');
    const validationPassed = await validateSystem(configPathResolved);

    if (!validationPassed) {
      process.exit(1);
    }

    // Load configuration after validation passes
    const configRaw = await fs.readFile(configPathResolved, 'utf8');
    const config = JSON.parse(configRaw);

    // Validate configuration before proceeding
    validateConfig(config);

    // Set up agent color mapping for verbose logging
    if (verbose) {
      const agentIds = Object.keys(config.agents || {});
      agentIds.forEach((agentId, index) => {
        agentColorMap.set(agentId, agentColors[index % agentColors.length]);
      });

      console.log('\n🎨 Agent Color Map:');
      agentIds.forEach((agentId) => {
        const color = agentColorMap.get(agentId);
        console.log(`${color}${agentId}${colors.reset}`);
      });
      console.log('\n');
    }

    console.log('Configuration validated successfully');
    if (verbose) {
      console.log('Verbose logging enabled - detailed execution logs will be shown');
    }
    console.log('Type your prompt and press Enter. Type "exit" to quit.\n');

    // Set up readline interface
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    try {
      while (true) {
        const userPrompt = (await rl.question('> ')).trim();

        if (!userPrompt) continue;

        const cmd = userPrompt.toLowerCase();
        if (cmd === 'exit' || cmd === 'quit' || cmd === ':q') break;

        await withTrace('Flow', async () => runFlow(config, userPrompt));
      }
    } finally {
      rl.close();
    }

  } catch (err) {
    die(err?.stack || err?.message || String(err));
  }
}
