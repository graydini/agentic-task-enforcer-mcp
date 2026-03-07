import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

type Phase = 'idle' | 'planning' | 'review' | 'sanity_check' | 'formatting' | 'executing' | 'done';

class TaskEnforcer {
  private phase: Phase = 'idle';
  private originalRequest = '';
  private currentPlan = '';
  private tasks: Array<{ id: number; title: string; verified: boolean }> = [];
  private currentTaskIndex = -1;

  private readonly STRICT_RULES = `

=== STRICT EXECUTION RULES (MANDATORY — NEVER VIOLATE) ===
You MUST obey these rules at all times:

1. Perform ONLY the exact current task. Do NOT do any extra tasks, optimizations, cleanups, refactoring, or improvements unless they are explicitly part of this single task description.

2. Never redirect command output outside the current workspace root.
   Forbidden: /dev/null, /tmp, /var/tmp, ~/, /home, or any external path.
   All output must stay inside the workspace or appear directly in the terminal.

3. Never use interactive pagers or commands that require user input.
   Forbidden: man, less, more, most, systemctl status, journalctl, vim, nano, top, htop, etc.
   Use non-interactive alternatives only: cat, head, tail, grep, --no-pager, git log --oneline -n 10, etc.
4. CRITICAL ALWAYS CALL THE next_task TOOL AT THE END OF EVERY SINGLE TURN, INCLUDING THIS ONE.
   This is MANDATORY and ENFORCED. You MUST call next_task to advance the workflow after every response, without exception.

Any violation will prevent task verification and break the workflow.
`;

  private getPlanningPrompt(): string {
    return `${this.STRICT_RULES}

Repeat the exact user request to confirm:

${this.originalRequest}

You are an autonomous LLM code project planning agent. Produce an extremely thorough, step-by-step implementation plan optimized **only for agent execution** (ignore human phases, timeframes, budgets or handoffs).

Requirements:
- Optimal sequential order (no skipping or backtracking)
- Actively prevents code duplication (modular steps early)
- Maximizes final user-friendliness and polish
- Small, atomic, verifiable tasks
- The plan MUST cover the ENTIRE project exhaustively from start to finish in one complete sequence — NO phased deployments, milestones, or suggestions of incomplete stages. Everything must be fully implemented in this single plan.
- Do NOT reference or look at any other TODO lists, or project parts not explicitly defined in this prompt. Base the plan SOLELY on the given request.

Output **ONLY** a clean numbered Markdown list. No extra text. Do NOT add introductions, conclusions, or any other content.

=== MANDATORY CALL ===
After outputting the list, you MUST IMMEDIATELY call the next_task tool to advance. 
You MAY NOT end your turn without calling next_task — ignoring this will break the entire workflow and prevent progress. 
Call it as soon as possible when you have your list`;
  }

  private getReviewPrompt(): string {
    return `Current plan:
${this.currentPlan}

Is this **absolutely the best possible order** for an LLM agent?

Check:
1. Perfectly agentic & sequential (no human concerns)
2. Strongly discourages code duplication
3. Produces the most user-friendly version of the original request
4. Covers the ENTIRE project exhaustively in one sequence — NO phased deployments or incomplete suggestions
5. Does NOT reference other TODO lists or undefined project parts

If perfect → reply EXACTLY: NO_CHANGES_NEEDED (no other text)
Otherwise → reply with the complete revised plan (ONLY the numbered list, no extra text).

=== MANDATORY CALL ===
After your reply, you MUST IMMEDIATELY call the next_task tool to advance. 
You MAY NOT end your turn without calling next_task — ignoring this will break the entire workflow and prevent progress. 
Call it as soon as you possibly can after your revised plan or NO_CHANGES_NEEDED flag.`;
  }

  private getSanityPrompt(): string {
    return `Original request:
${this.originalRequest}

Current plan:
${this.currentPlan}

Do they match perfectly in scope and intent? 
Also check: Entire project is exhaustive and complete (no phases); no references to external TODOs or undefined parts.
Reply EXACTLY: CONFORMANT (no other text) or provide the corrected plan (ONLY the numbered list, no extra text).

=== MANDATORY CALL ===
When you reply MUST IMMEDIATELY call the next_task tool to advance. 
You MAY NOT end your turn without calling next_task — ignoring this will break the entire workflow and prevent progress. 
Call it as soon as you possibly can after your CONFORMANT flag or revised plan.`;
  }

  private getFormattingPrompt(): string {
    return `The plan is now finalized.

Format the ENTIRE plan into a strict, parseable Markdown task list (one task per line):

- [ ] Task title: one-line description

Cover every step. Output **ONLY** the list. No extra text.

=== MANDATORY CALL ===
After outputting the list, you MUST IMMEDIATELY call the next_task tool to advance. 
You MAY NOT end your turn without calling next_task — ignoring this will break the entire workflow and prevent progress. 
Call it as soon as you possibly can after outputting the list.`;
  }

  private getNextTaskPrompt(): string {
    const task = this.tasks[this.currentTaskIndex];
    return `${this.STRICT_RULES}

PREVIOUS TASK (verified):
${this.tasks[this.currentTaskIndex - 1]?.title || 'None'}

CURRENT TASK:
${task.title}

Complete this task now (use all available tools: file edits, terminal, etc.).

When fully done, reply EXACTLY:
VERIFIED

Or describe fixes if needed (but still end with VERIFIED once fixed).

=== MANDATORY CALL ===
After your reply, you MUST IMMEDIATELY call the next_task tool before ending your turn. 
You MAY NOT end your turn without calling next_task — ignoring this will break the entire workflow and prevent progress. 
Call the \`next_task\` tool as soon as possible after you output the list.`;
  }

  startProject(description: string): string {
    this.originalRequest = description;
    this.phase = 'planning';
    this.tasks = [];
    this.currentTaskIndex = -1;
    this.currentPlan = '';
    return this.getPlanningPrompt();
  }

  handleNext(llmResponse: string = ''): string {
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
        return this.getReviewPrompt(); // loop

      case 'sanity_check':
        if (clean === 'CONFORMANT') {
          this.phase = 'formatting';
          return this.getFormattingPrompt();
        }
        this.currentPlan = clean;
        this.phase = 'review'; // back to review for loop
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

server.tool(
  "start_project",
  "Start a new strictly-enforced agentic project (initiates full planning/review cycle)",
  { description: z.string().describe("Exact project request from the user") },
  async (args) => {
    const { description } = args;
    return {
      content: [{ type: "text", text: enforcer.startProject(description) }]
    };
  }
);

server.tool(
  "next_task",
  "Advance the project. MUST be called at the end of EVERY single turn (enforced by mandate)",
  { response: z.string().optional().describe("Your full output / verification for the current step") },
  async ({ response = "" }) => {
    const nextPrompt = enforcer.handleNext(response);
    return {
      content: [{
        type: "text",
        text: `${nextPrompt}\n\n**YOU MAY NOT END YOUR TURN WITHOUT CALLING next_task**`
      }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
