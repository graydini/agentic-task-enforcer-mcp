import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
class TaskEnforcer {
    phase = 'idle';
    originalRequest = '';
    currentPlan = '';
    tasks = [];
    currentTaskIndex = -1;
    // ──────────────────────────────────────────────────────────────
    // YOUR NEW STRICT RULES (enforced in every prompt)
    // ──────────────────────────────────────────────────────────────
    STRICT_RULES = `

=== STRICT EXECUTION RULES (MANDATORY — NEVER VIOLATE) ===
You MUST obey these rules at all times:

1. Perform ONLY the exact current task. Do NOT do any extra tasks, optimizations, cleanups, refactoring, or improvements unless they are explicitly part of this single task description.

2. Never redirect command output outside the current workspace root.
   Forbidden: /dev/null, /tmp, /var/tmp, ~/, /home, or any external path.
   All output must stay inside the workspace or appear directly in the terminal.

3. Never use interactive pagers or commands that require user input.
   Forbidden: man, less, more, most, systemctl status, journalctl, vim, nano, top, htop, etc.
   Use non-interactive alternatives only: cat, head, tail, grep, --no-pager, git log --oneline -n 10, etc.

Any violation will prevent task verification and break the workflow.
`;
    getPlanningPrompt() {
        return `${this.STRICT_RULES}

Repeat the exact user request to confirm:

${this.originalRequest}

You are an autonomous LLM coding agent. Produce an extremely thorough, step-by-step implementation plan optimized **only for agent execution**.

Requirements:
- Optimal sequential order
- Prevents code duplication
- Maximizes final user-friendliness
- Small, atomic, verifiable tasks

Output **ONLY** a clean numbered Markdown list. No extra text.

When finished, you MUST call the next_task tool.`;
    }
    getReviewPrompt() {
        return `Current plan:
${this.currentPlan}

Is this **absolutely the best possible order** for an LLM agent?

Check:
1. Perfectly agentic & sequential
2. Strongly discourages code duplication
3. Produces the most user-friendly version of the original request

If perfect → reply exactly: NO_CHANGES_NEEDED
Otherwise → reply with the complete revised plan (only the numbered list).

When finished, you MUST call the next_task tool.`;
    }
    getSanityPrompt() {
        return `Original request:
${this.originalRequest}

Current plan:
${this.currentPlan}

Do they match perfectly in scope and intent? 
Reply exactly: CONFORMANT or provide the corrected plan.

When finished, you MUST call the next_task tool.`;
    }
    getFormattingPrompt() {
        return `The plan is now finalized.

Format the ENTIRE plan into a strict, parseable Markdown task list (one task per line):

- [ ] Task title: one-line description

Cover every step. Output **ONLY** the list.

When finished, you MUST call the next_task tool.`;
    }
    getNextTaskPrompt() {
        const task = this.tasks[this.currentTaskIndex];
        return `${this.STRICT_RULES}

PREVIOUS TASK (verified):
${this.tasks[this.currentTaskIndex - 1]?.title || 'None'}

CURRENT TASK:
${task.title}

Complete this task now (use all available tools: file edits, terminal, etc.).

When fully done reply exactly:
VERIFIED

Or describe fixes if needed.

After your response you MUST call the next_task tool before ending your turn.`;
    }
    startProject(description) {
        this.originalRequest = description;
        this.phase = 'planning';
        this.tasks = [];
        this.currentTaskIndex = -1;
        this.currentPlan = '';
        return this.getPlanningPrompt();
    }
    handleNext(llmResponse = '') {
        const clean = llmResponse.trim();
        switch (this.phase) {
            case 'planning':
                this.currentPlan = clean;
                this.phase = 'review';
                return this.getReviewPrompt();
            case 'review':
                if (clean === 'NO_CHANGES_NEEDED') {
                    this.phase = 'sanity_check';
                    return this.getSanityPrompt();
                }
                this.currentPlan = clean;
                return this.getReviewPrompt();
            case 'sanity_check':
                if (clean === 'CONFORMANT') {
                    this.phase = 'formatting';
                    return this.getFormattingPrompt();
                }
                this.currentPlan = clean;
                this.phase = 'review';
                return this.getReviewPrompt();
            case 'formatting':
                this.tasks = clean
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.startsWith('- [ ]'))
                    .map((line, idx) => ({
                    id: idx,
                    title: line.replace(/^- \[ \]\s*/, '').trim(),
                    verified: false
                }));
                this.currentTaskIndex = 0;
                this.phase = 'executing';
                return this.getNextTaskPrompt();
            case 'executing':
                const isVerified = clean.toUpperCase().includes('VERIFIED');
                if (isVerified) {
                    if (this.currentTaskIndex < this.tasks.length) {
                        this.tasks[this.currentTaskIndex].verified = true;
                    }
                    this.currentTaskIndex++;
                    if (this.currentTaskIndex >= this.tasks.length) {
                        this.phase = 'done';
                        return "✅ ALL TASKS COMPLETED. Nothing left to do. You may now end your turn.";
                    }
                    return this.getNextTaskPrompt();
                }
                return `Fixes required for current task. Try again.\n\n${this.getNextTaskPrompt()}`;
            case 'done':
                return "Nothing left to do. You may now end your turn.";
        }
        return "Call next_task again.";
    }
}
const enforcer = new TaskEnforcer();
const server = new McpServer({
    name: "agentic-task-enforcer",
    version: "1.0.0"
});
server.tool("start_project", "Start a new strictly-enforced agentic project (initiates full planning/review cycle)", {
    description: z.string().describe("Exact project request from the user")
}, async (args) => {
    const { description } = args;
    return {
        content: [{ type: "text", text: enforcer.startProject(description) }]
    };
});
server.tool("next_task", "Advance the project. MUST be called at the end of EVERY single turn", { response: z.string().optional().describe("Your full output / verification for the current step") }, async ({ response = "" }) => {
    const nextPrompt = enforcer.handleNext(response);
    return {
        content: [{
                type: "text",
                text: `${nextPrompt}\n\n**YOU MAY NOT END YOUR TURN WITHOUT CALLING next_task**`
            }]
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch(console.error);
