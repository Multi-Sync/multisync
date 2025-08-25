# Multisync 🔄

[![npm version](https://img.shields.io/npm/v/multisync.svg?logo=npm&color=cb3837)](https://www.npmjs.com/package/multisync)

> **Multi-agent workflow orchestrator for AI-powered automation**  
> Compose, validate, and run AI agent workflows in Node.js & via CLI.

🌐 **Dashboard** → [dashboard.multisync.io](https://dashboard.multisync.io)  
📖 **Docs** → [multisync.io](https://multisync.io)

---

## ✨ Features

- 🔄 **Multi-Agent Workflows**: Chain AI agents in sequence or review loops
- 📋 **Structured Outputs**: Enforce JSON Schema for safe responses
- 👀 **Agent Reviewer**: Add QA cycles where agents critique each other
- 🖥️ **CLI & Interactive Mode**: Run configs directly from terminal
- 🔧 **MCP Server Integration**: Stdio + HTTP support
- 🛡 **System Validation**: API key, Node.js, deps checked before run

---

## 🚀 Quick Start

### Install

```bash
# CLI (global)
npm install -g multisync

# Library (inside your project)
npm install multisync
```

## 🖥️ CLI Usage

```bash
# Run with a config file
multisync --config=my-workflow.json

# Enable verbose logging
multisync --config=my-workflow.json --verbose

# Run system validation
multisync --setup
```

## 📦 Library Usage (Node.js Project)

You can import multisync/core into your own project to run agent flows directly:

```js
// myApp.js
import { runFlow, validateConfig } from 'multisync/core';
import fs from 'node:fs/promises';

async function main() {
  const raw = await fs.readFile('./my-workflow.json', 'utf8');
  const config = JSON.parse(raw);

  // Validate before running
  validateConfig(config);

  // Run flow with a user prompt
  const result = await runFlow(config, 'Write a haiku about the ocean');

  console.log('Workflow result:', result);
}

main().catch(console.error);
```

Example output:

```js
{
  "result": "Whispers on the tide / Echoes drift across the waves / Silence sings ashore"
}
```

## 📋 Config Example

```json
{
  "outputSchemas": {
    "ResultString": {
      "type": "object",
      "properties": { "result": { "type": "string" } },
      "required": ["result"]
    }
  },
  "agents": {
    "echo": {
      "name": "Echo Agent",
      "instructions": "Repeat the user input inside the result property",
      "outputSchemaRef": "ResultString"
    }
  },
  "flow": {
    "steps": [{ "id": "step1", "type": "single_agent", "agentRef": "echo" }]
  }
}
```

## 📄 License

Apache 2.0 © Multisync Inc.

Built with ❤️ on top of OpenAI Agents SDK
