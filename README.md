# Multisync 🔄

> **Multi-agent workflow orchestrator for AI-powered task automation**

Multisync is a powerful Node.js library that enables you to create complex, multi-step AI workflows using multiple AI agents. Each agent can perform specific tasks, and the system orchestrates the flow between them, allowing for sophisticated automation of AI-powered processes.

**🎯 For the full vision and latest updates, visit [multisync.io](https://multisync.io)**

**🛠️ Create your agent-compose.json files at [dashboard.multisync.io](https://dashboard.multisync.io)**

## 🎨 Agent Composer Dashboard

Create and manage your multi-agent workflows visually using our web-based dashboard:

- **🖥️ Visual Workflow Builder**: Drag-and-drop interface for creating complex agent workflows
- **📋 Template Library**: Pre-built workflow templates for common use cases
- **🔧 Schema Editor**: Easy-to-use JSON Schema builder for agent outputs
- **📤 Export**: Generate ready-to-use `agent-compose.json` files for the CLI

Visit [dashboard.multisync.io](https://dashboard.multisync.io) to get started!

## ✨ Features

- **🔄 Multi-Agent Workflows**: Chain multiple AI agents together in sequential or review-based workflows
- **📋 Structured Outputs**: Enforce strict output schemas using JSON Schema validation
- **🔍 Agent Review System**: Implement review loops where agents can validate and improve each other's work
- **🎨 Verbose Logging**: Detailed, color-coded logging for debugging and monitoring
- **⚡ System Validation**: Pre-execution checks for API keys, dependencies, and system requirements
- **📱 CLI Interface**: Easy-to-use command-line interface with interactive mode
- **🔧 MCP Server Integration**: Support for Model Context Protocol servers (stdio and HTTP)
- **🚀 Ollama Support**: Coming soon! Local AI model support for offline workflows

## 🚀 Quick Start

### Installation

````bash
# Install globally for CLI usage
npm install -g multisync

### Basic Usage

```bash
# Run with a configuration file
multisync --config=my-workflow.json

# Enable verbose logging
multisync --config=my-workflow.json --verbose

# Run system setup and validation
multisync --setup

## 📖 Configuration

Multisync uses JSON configuration files to define your workflows. Here's a basic example:

```json
{
  "version": "1.0",
  "outputSchemas": {
    "ResultString": {
      "type": "object",
      "properties": {
        "result": { "type": "string" }
      },
      "required": ["result"]
    }
  },
  "agents": {
    "my_agent": {
      "name": "My Agent",
      "instructions": "You are a helpful AI agent. Always return your response in the result property.",
      "outputSchemaRef": "ResultString",
      "modelSettings": { "store": false, "temperature": 0.7 }
    }
  },
  "flow": {
    "steps": [
      {
        "id": "step1",
        "type": "single_agent",
        "agentRef": "my_agent",
        "io": { "carryHistory": true }
      }
    ]
  }
}
````

## 🔧 Configuration Components

### Output Schemas

Define the structure of your agent outputs using JSON Schema:

```json
"outputSchemas": {
  "MySchema": {
    "type": "object",
    "properties": {
      "result": { "type": "string" },
      "score": { "type": "number" }
    },
    "required": ["result", "score"]
  }
}
```

**Important**: All output schemas must have a `result` property that is required.

### Agents

Configure AI agents with specific instructions and output schemas:

```json
"agents": {
  "agent_id": {
    "name": "Agent Display Name",
    "instructions": "Detailed instructions for the agent",
    "outputSchemaRef": "SchemaName",
    "modelSettings": { "store": false, "temperature": 0.7 },
    "mcpServerRefs": ["server_id"],
    "tools": []
  }
}
```

### Flow Steps

Define the sequence of your workflow:

#### Single Agent Step

```json
{
  "id": "step1",
  "type": "single_agent",
  "agentRef": "agent_id",
  "io": { "carryHistory": true }
}
```

#### Agent Reviewer Step

```json
{
  "id": "step2",
  "type": "agent_reviewer",
  "proposalAgentRef": "proposal_agent_id",
  "reviewerAgentRef": "reviewer_agent_id",
  "passCondition": "result.score > 0.8",
  "maxTurns": 3,
  "feedbackInjection": "as_user",
  "io": { "carryHistory": true }
}
```

## 🌟 Advanced Examples

### Translation Workflow

Create a multi-language translation pipeline:

```json
{
  "version": "1.0",
  "outputSchemas": {
    "Translation": {
      "type": "object",
      "properties": {
        "result": {
          "type": "object",
          "properties": {
            "original": { "type": "string" },
            "arabic": { "type": "string" },
            "french": { "type": "string" },
            "english": { "type": "string" }
          },
          "required": ["original", "arabic", "french", "english"]
        }
      },
      "required": ["result"]
    }
  },
  "agents": {
    "arabic_translator": {
      "name": "Arabic Translator",
      "instructions": "Translate the input to Arabic",
      "outputSchemaRef": "Translation"
    },
    "french_translator": {
      "name": "French Translator",
      "instructions": "Translate the input to French",
      "outputSchemaRef": "Translation"
    },
    "english_translator": {
      "name": "English Translator",
      "instructions": "Translate the input to English",
      "outputSchemaRef": "Translation"
    }
  },
  "flow": {
    "steps": [
      {
        "id": "step1",
        "type": "single_agent",
        "agentRef": "arabic_translator"
      },
      {
        "id": "step2",
        "type": "single_agent",
        "agentRef": "french_translator"
      },
      {
        "id": "step3",
        "type": "single_agent",
        "agentRef": "english_translator"
      }
    ]
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

This project is licensed under the [Apache 2.0 License](LICENSE) - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/Multi-Sync/multisync/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Multi-Sync/multisync/issues)
- **Documentation**: [GitHub Wiki](https://github.com/Multi-Sync/multisync/wiki)
- **Community**: [multisync.io](https://multisync.io)

## 🙏 Acknowledgments

- Built with [OpenAI Agents SDK](https://github.com/openai/agents)
- Inspired by modern workflow automation tools
- Community contributors and feedback

---

**Made with ❤️ by the Multisync Team**
