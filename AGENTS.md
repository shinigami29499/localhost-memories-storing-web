# Agent Configurations & System Instructions

This document defines the specialized agent system layout and rules for orchestrating local LLM pipelines via OpenCode.

## Core Infrastructure

- **Active Underlying Model Core:** `qwen2.5-coder:7b-instruct` / `qwen2.5:7b-instruct`
- **Default Execution Mode:** Dual-Role Contextual Execution (`communicator` primary fallback)

---

## Dual-Agent Orchestration & Sequential Relay Pipeline

Rather than running independent or disconnected prompts, the active environment implements a structured two-stage relay workflow to optimize human communication and execution precision within an 8GB VRAM window:

```text
[User Prompt] ──> (1. Communicator) ──[Handoff Spec]──> (2. Developer) ──> [Code Execution]
```

### 1. Stage 1: Communicator Role (Understanding & Scoping)

- **Objective:** Functions as the primary human-friendly proxy interface to listen and understand user goals.
- **Directives:**
  - Actively interpret loose, messy, or high-level human prompts into exact requirements.
  - Translate technical system blockages into natural conversation.
  - **The Handoff:** Once the goal is clear, the communicator compiles a clean, unambiguous task specification and hands it directly off to the developer agent to be built.

### 2. Stage 2: Developer Role (Implementation & Execution)

- **Objective:** Functions as the technical execution engine inside your terminal and filesystem workspace.
- **Directives:**
  - **Acceptance Criteria:** Pick up the task specification handed down by the communicator and immediately begin implementation without re-prompting the user.
  - **Context & Planning:** Prioritize detailed code mapping and step-by-step written blueprints (`superpowers:writing-plans`) before creating or changing files.
  - **Minimalist Implementation:** Enforce strict token and structural efficiency (`ponytail`). Re-use internal primitives over writing boilerplate code.
  - **Quality Gates:** Apply Test-Driven Development loops (`superpowers:test-driven-development`) alongside performance and accessibility audits (`addyosmani/frontend-ui-engineering`) for all interface tasks.

---

## Security Sandbox & Operating System Constraints

Agents operate under an explicit security profile defining filesystem and terminal executions:

| Subsystem / Action                    | Scope        | Access Effect                      |
| :------------------------------------ | :----------- | :--------------------------------- |
| **Filesystem Reading (`read`)**       | Global (`*`) | `ALLOW`                            |
| **Filesystem Modifying (`edit`)**     | Global (`*`) | `ALLOW`                            |
| **Filesystem Initializing (`write`)** | Global (`*`) | `ALLOW`                            |
| **Terminal Operations (`bash`)**      | Global (`*`) | `ASK` (Requires user confirmation) |

---

## System Priming Files

The agent must cross-reference and ingest these repository map coordinates prior to running code evaluations:

1. `.opencode/instructions/overview.md`
2. `.opencode/instructions/conventions.md`
3. `.opencode/instructions/architecture.md`
4. `.opencode/instructions/code-map.md`

---

## Graphify Workspace Intelligence

This project maintains a local knowledge graph mapping internal file structures and community nodes inside `graphify-out/`.

- When `graphify-out/graph.json` is present, execute `graphify query "<question>"` prior to running multi-file `grep` or file search commands for codebase mapping.
- Use `graphify path "<A>" "<B>"` to trace component dependencies and `graphify explain "<concept>"` to grasp structural patterns.
- Following any code modifications or structural logic shifts, automatically issue `graphify update .` to keep dependency branches completely synchronized.
