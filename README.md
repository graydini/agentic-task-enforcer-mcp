# Agentic Task Enforcer (MCP)

Strict agentic task management that replaces VS Code's TODO list. Enforces planning, review, sanity checks, and one-task-at-a-time execution with mandatory `next_task` calls. Implemented as a Model Context Protocol (MCP) server extension.

## Features

- 🧠 Agentic planning and review cycle
- 📋 Single-task focus with enforced `next_task` callbacks
- 🚨 Sanity checks and mandatory planning steps
- 🔌 Integrates with VS Code via MCP server definition provider

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/graydenfisher/agentic-task-enforcer-mcp.git
   cd agentic-task-enforcer-mcp
   ```
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Package the extension and install the `.vsix` file:
   ```bash
   npm run package
   code --install-extension agentic-task-enforcer-mcp-1.0.1.vsix
   ```

## Usage

- Activate the extension via the **Command Palette** (`Ctrl+Shift+P`) and run `Agentic Task Enforcer: Activate`.
- The MCP server will enforce the planning/review workflow when interacting with compatible AI agents.

## Contributing

Contributions are welcome! Feel free to open issues or pull requests on [GitHub](https://github.com/graydenfisher/agentic-task-enforcer-mcp).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
