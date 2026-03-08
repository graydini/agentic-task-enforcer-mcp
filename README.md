# Agentic Task Enforcer (MCP)

This extension is a self‑contained, **strict agentic task manager** that replaces
`// TODO` comments and ad‑hoc mental checklists with a formal, enforced workflow.
It runs entirely inside your VS Code workspace as a Model Context Protocol (MCP)
server, and it is designed to work seamlessly with Copilot and other MCP‑aware
AI tools **without issuing any external API requests** of its own.

When activated an intelligent agent is compelled to:

1. **Repeat the user request.**  (Verification)
2. **Produce a thorough step‑by‑step plan.**  (planning phase)
3. **Review and sanity‑check its own plan.**  (review & sanity phases)
4. **Convert the plan into a numbered task list.**
5. **Execute one task at a time.**  (enforced by required `next_task` calls)
6. **Re‑plan if necessary,** with each human or agent step fully audited.

Because the logic lives in a local MCP server, the entire interaction is
handled via the normal Copilot/MCP channel; there is **no separate network
connection** or subscription requirement. Copilot simply sends and receives
prompts through the extension as if talking to any other language model. The
extension itself never calls the OpenAI (or GitHub) API – it just coordinates
messages and enforces the strict rules outlined in its prompts.

This means:

- ✅ You can use the enforcer with **any LLM** plugged into VS Code via Copilot.
- ✅ **No additional billing or credentials** are needed beyond what your
tagged agent already uses. Ideally you only burn 1 premium request for the entire project (or whatever the multiplier of that model)

The result is a reproducible, auditable “one task at a time” process that
prevents wandering agents, refactoring detours, and hidden background
workflows.

## Features

- 🧠 **Agentic planning and review cycle** ensures every request yields an agent
  verified, step‑by‑step plan.
- 📋 **Single‑task focus** with enforced `next_task` callbacks — no multi‑threaded
  or background actions.
- 🚨 **Sanity checks** built into the protocol that catch mismatches and scope
  creep. Forces the model to really thing about if their proposal and revisions actually match the ORIGINAL intent.
- 🔌 **MCP‑based integration**: works with Copilot or any other MCP client.
- 🔒 **No external APIs**: all coordination happens in‑workspace, avoiding extra usage charges.

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

1. Install and activate the extension as described below.
2. Open the Copilot Chat sidebar (or any other MCP‑compatible chat window).
3. Start a conversation and **explicitly invoke the enforcer** by sending the
   `start_project` or `next_task` tool calls. Typically the extension adds a
   command to the Command Palette, but you can also trigger it programmatically
   via other automation if you prefer.
4. The server will guide the agent through the planning/review/execution
   cycle described above. After each task is completed you must call `next_task`
   (the extension adds tooling for this) to proceed.

> 💡 You don’t need to configure API keys or endpoints. Copilot handles all of
> the language model interactions; this extension only coordinates the flow.

### Example

```
> start_project {"description": "Refactor data import module"}
... [agent returns plan]
> next_task VERIFIED
... [agent executes first task]
```

Because the entire protocol is text‑based and wrapped in MCP calls, you can
reuse these workflows with custom scripts, tests, or other agents.

## Contributing

Contributions are welcome! Feel free to open issues or pull requests on [GitHub](https://github.com/graydini/agentic-task-enforcer-mcp).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
