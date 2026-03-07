import * as vscode from 'vscode';
export function activate(context) {
    const providerId = 'agenticTaskEnforcer';
    // allow manual activation via command palette
    context.subscriptions.push(vscode.commands.registerCommand('agenticTaskEnforcer.activate', () => {
        // nothing needed here; activation event ensures provider registration
    }));
    context.subscriptions.push(vscode.lm.registerMcpServerDefinitionProvider(providerId, {
        provideMcpServerDefinitions: async () => {
            const serverPath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'mcp-server.js').fsPath;
            return [
                new vscode.McpStdioServerDefinition("Agentic Task Enforcer", // label
                "node", // command
                [serverPath], // args
                {}, // env
                "1.0.0" // version
                )
            ];
        }
    }));
    vscode.window.showInformationMessage('✅ Agentic Task Enforcer MCP is ready!');
}
export function deactivate() { }
