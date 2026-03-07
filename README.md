# Agentic Task Enforcer (MCP)

Strict agentic task management that replaces VS Code's TODO list. Enforces planning, review, sanity checks, and one-task-at-a-time execution with mandatory `next_task` calls. Implemented as a Model Context Protocol (MCP) server extension.

## Features

- 🧠 Agentic planning and review cycle
- 📋 Single-task focus with enforced `next_task` callbacks
- 🚨 Sanity checks and mandatory planning steps
- 🔌 Integrates with VS Code via MCP server definition provider

## Installation

1. Clone the repository (create a local folder matching the repo name):
   ```bash
   git clone https://github.com/graydini/agentic-task-enforcer-mcp.git
   cd agentic-task-enforcer-mcp        # change into the project root
   ```
2. Install dependencies and compile the TypeScript sources:
   ```bash
   npm install
   npm run build                        # outputs to ./dist
   ```
3. Package the VS Code extension and install it locally. The generated
   filename includes the current version, so you can use a wildcard to
   avoid hard‑coding:
   ```bash
   npm run package                      # creates agentic-task-enforcer-mcp-<ver>.vsix
   code --install-extension *.vsix      # or specify the exact name
   ```

## Usage

- Activate the extension via the **Command Palette** (`Ctrl+Shift+P`) and run `Agentic Task Enforcer: Activate`.
- The MCP server will enforce the planning/review workflow when interacting with compatible AI agents.

## Contributing

Contributions are welcome! Feel free to open issues or pull requests on [GitHub](https://github.com/graydini/agentic-task-enforcer-mcp).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
