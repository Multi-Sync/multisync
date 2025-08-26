// core.mjs
import { Agent, MCPServerStdio, run } from '@openai/agents';
import { z } from 'zod';

/* -------- API key enforcement -------- */
export function ensureOpenAIKey(explicitKey) {
  if (explicitKey && typeof explicitKey === 'string') {
    process.env.OPENAI_API_KEY = explicitKey; // authoritative override
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.trim()) {
    throw new Error('Missing OpenAI API key. Provide --api-key or set OPENAI_API_KEY.');
  }
  return key;
}

/* -------- JSON Schema → Zod -------- */
function jsonSchemaToZod(schema) {
  if (!schema) { return z.any(); }
  if (schema.type === 'string') { return schema.enum ? z.enum(schema.enum) : z.string(); }
  if (schema.type === 'number' || schema.type === 'integer') { return z.number(); }
  if (schema.type === 'boolean') { return z.boolean(); }
  if (schema.type === 'array') { return z.array(jsonSchemaToZod(schema.items || {})); }
  if (schema.type === 'object' || schema.properties) {
    const shape = {};
    const req = new Set(schema.required || []);
    for (const [k, v] of Object.entries(schema.properties || {})) {
      let zf = jsonSchemaToZod(v);
      if (!req.has(k)) { zf = zf.optional(); }
      shape[k] = zf;
    }
    let obj = z.object(shape);
    if (schema.additionalProperties === false) { obj = obj.strict(); }
    return obj;
  }
  return z.any();
}

/* -------- Config validation -------- */
export function validateConfig(config) {
  if (!config?.flow) { throw new Error('Configuration must contain a "flow" property'); }
  if (!config.flow.steps?.length) { throw new Error('Flow must contain at least one step'); }

  for (const [name, schema] of Object.entries(config.outputSchemas || {})) {
    if (!schema.properties?.result) { throw new Error(`Output schema "${name}" must have "result" property`); }
    if (!schema.required?.includes('result')) { throw new Error(`Output schema "${name}" must require "result"`); }
  }
  for (const [id, agent] of Object.entries(config.agents || {})) {
    if (!agent.outputSchemaRef) { throw new Error(`Agent "${id}" must have outputSchemaRef`); }
    if (!config.outputSchemas?.[agent.outputSchemaRef]) {
      throw new Error(`Agent "${id}" references unknown schema "${agent.outputSchemaRef}"`);
    }
  }
}

/* -------- Builders -------- */
export async function buildMcpServers(mcpConfig) {
  const mcp = {};
  const connects = [];
  for (const [id, cfg] of Object.entries(mcpConfig || {})) {
    const type = cfg.type?.toLowerCase();
    if (type === 'stdio') {
      const full = [cfg.fullCommand, ...(cfg.args || [])].filter(Boolean).join(' ');
      const srv = new MCPServerStdio({ name: cfg.name || id, fullCommand: full });
      mcp[id] = srv;
      connects.push(srv.connect());
    } else if (type === 'http') {
      mcp[id] = cfg.url; // Agents SDK accepts URL directly
    }
  }
  await Promise.all(connects);
  return mcp;
}

export function buildAgents(agentsConfig, mcpRegistry, outputSchemas) {
  const base = {};
  for (const [id, a] of Object.entries(agentsConfig || {})) {
    const zodSchema = jsonSchemaToZod(outputSchemas[a.outputSchemaRef]);
    const mcpRefs = (a.mcpServerRefs || []).map(ref => mcpRegistry[ref]).filter(Boolean);
    base[id] = new Agent({
      name: a.name || id,
      instructions: a.instructions || '',
      outputType: zodSchema,
      modelSettings: a.modelSettings || {},
      mcpServers: mcpRefs,
    });
  }
  const finalAgents = {};
  for (const [id, a] of Object.entries(agentsConfig || {})) {
    const tools = [];
    for (const t of a.tools || []) {
      if (t.kind === 'agent' && base[t.ref]) {
        tools.push(
          base[t.ref].asTool({
            toolName: t.id || t.ref,
            toolDescription: t.description || `Tool for agent ${t.ref}`,
          }),
        );
      }
    }
    const zodSchema = jsonSchemaToZod(outputSchemas[a.outputSchemaRef]);
    const mcpRefs = (a.mcpServerRefs || []).map(ref => mcpRegistry[ref]).filter(Boolean);
    finalAgents[id] = new Agent({
      name: a.name || id,
      instructions: a.instructions || '',
      outputType: zodSchema,
      modelSettings: a.modelSettings || {},
      mcpServers: mcpRefs,
      tools,
    });
  }
  return finalAgents;
}

/* -------- Executors -------- */
async function execSingleAgent(agent, history, carryHistory = true) {
  const res = await run(agent, history);
  return { finalOutput: res.finalOutput, history: carryHistory ? (res.history || history) : history };
}

function evalExpr(expr, ctx) {
  // eslint-disable-next-line no-new-func
  try { const fn = new Function(...Object.keys(ctx), `return (${expr});`); return fn(...Object.values(ctx)); }
  catch { return false; }
}

async function execAgentReviewer(
  proposalAgent, reviewerAgent, history,
  { passCondition = 'score == \'pass\'', maxTurns = 8, feedbackInjection = 'as_user', carryHistory = true },
) {
  let turn = 0, lastProposal = null, nextHistory = history;
  while (turn < maxTurns) {
    turn++;
    const prop = await run(proposalAgent, nextHistory);
    lastProposal = prop.finalOutput ?? null;
    if (carryHistory) { nextHistory = prop.history || nextHistory; }

    const rev = await run(reviewerAgent, nextHistory);
    const review = rev.finalOutput || {};
    if (carryHistory) { nextHistory = rev.history || nextHistory; }

    const pass = evalExpr(passCondition, { ...review, turn, maxTurns });
    if (pass) { return { finalOutput: lastProposal, history: nextHistory, passed: true }; }

    const fb = review?.feedback ?? JSON.stringify(review);
    if (feedbackInjection === 'as_system') { nextHistory = [...nextHistory, { role: 'system', content: `Feedback: ${fb}` }]; }
    else if (feedbackInjection === 'as_user') { nextHistory = [...nextHistory, { role: 'user', content: `Feedback: ${fb}` }]; }
  }
  return { finalOutput: lastProposal, history: nextHistory, passed: false };
}

/* -------- Public runner -------- */
export async function runFlow(config, userPrompt, opts = {}) {
  ensureOpenAIKey(opts.apiKey);
  validateConfig(config);

  const mcpRegistry = await buildMcpServers(config.mcpServers || {});
  const agents = buildAgents(config.agents || {}, mcpRegistry, config.outputSchemas || {});

  let history = [{ role: 'user', content: userPrompt }];
  let currentOutput = null;

  if (opts.verbose) {
    console.log(`🔍 Starting flow execution (${config.flow.steps.length} steps)...`);
  }

  for (const [index, step] of config.flow.steps.entries()) {
    if (opts.verbose) {
      const stepNum = index + 1;
      if (step.type === 'single_agent') {
        console.log(`📋 Step ${stepNum}/${config.flow.steps.length}: ${step.type} (agent: "${step.agentRef ?? "(none)"}")`);
      } else if (step.type === 'agent_reviewer') {
        console.log(`📋 Step ${stepNum}/${config.flow.steps.length}: ${step.type} (proposal: "${step.proposalAgentRef}", reviewer: "${step.reviewerAgentRef}")`);
      }
    }

    if (step.type === 'single_agent') {
      const agent = agents[step.agentRef];
      const { finalOutput, history: h } =
        await execSingleAgent(agent, history, step?.io?.carryHistory !== false);
      currentOutput = finalOutput; history = h;
    } else if (step.type === 'agent_reviewer') {
      const proposal = agents[step.proposalAgentRef];
      const reviewer = agents[step.reviewerAgentRef];
      const { finalOutput, history: h } =
        await execAgentReviewer(proposal, reviewer, history, {
          passCondition: step.passCondition || 'score == \'pass\'',
          maxTurns: typeof step.maxTurns === 'number' ? step.maxTurns : 8,
          feedbackInjection: step.feedbackInjection || 'as_user',
          carryHistory: step?.io?.carryHistory !== false,
        });
      currentOutput = finalOutput; history = h;
    } else {
      throw new Error(`Unknown step type: ${step.type}`);
    }

    if (opts.verbose) {
      console.log(`✅ Step ${index + 1} completed`);
    }
  }

  if (currentOutput === null) { return { result: '' }; }
  if (typeof currentOutput === 'string') { throw new Error('Output must be an object with a required "result" property'); }
  if (!currentOutput.result) { throw new Error('Output must include "result"'); }

  if (opts.verbose) {
    console.log('🎉 Flow execution completed successfully');
  }

  return currentOutput;
}
