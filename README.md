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

## 🔑 Prerequisites

- **Node.js 18+**: Required for ES modules and modern JavaScript features
- **OpenAI API Key**: Set as `OPENAI_API_KEY` system environment variable
- **MCP Servers**: If using MCP integration (optional)

> **💡 Tip**: Set your OpenAI API key as a system environment variable:
>
> ```bash
> export OPENAI_API_KEY="your-api-key-here"
> ```

## 📋 CLI Commands

| Command                                  | Description                     |
| ---------------------------------------- | ------------------------------- |
| `multisync`                              | Start interactive mode          |
| `multisync --config=file.json`           | Run with configuration file     |
| `multisync --config=file.json --verbose` | Run with verbose logging        |
| `multisync --setup`                      | Run system setup and validation |
| `multisync --help`                       | Show help information           |

## 🛠️ Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/Multi-Sync/multisync.git
cd multisync

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Start development mode
npm run dev
```

### Project Structure

```
multisync/
├── cli.mjs          # Command-line interface
├── parser.mjs       # Core workflow execution engine
├── validator.mjs    # System validation and checks
├── templates/       # Example configuration files
├── tests/          # Test suite
└── package.json    # Project configuration
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/validator.test.mjs
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

**🎯 Join our community at [multisync.io](https://multisync.io) to see our full vision and roadmap!**

## 🚀 Coming Soon

- **🦙 Ollama Integration**: Run workflows with local AI models for offline and privacy-focused use cases
- **🌐 Multi-Provider Support**: Support for Anthropic, Google, and other AI providers
- **📊 Workflow Analytics**: Monitor and optimize your agent workflows
- **🔐 Enterprise Features**: Role-based access control and team collaboration
- **📱 Mobile App**: iOS and Android apps for workflow management

Stay updated at [multisync.io](https://multisync.io)!

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

Apache 2.0 © Multisync Inc.

Built with ❤️ on top of OpenAI Agents SDK
