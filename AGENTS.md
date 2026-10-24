# Agent Configurations & System Instructions

This document defines the specialized agent system layout and rules for orchestrating local LLM pipelines via OpenCode.

## Core Infrastructure

- **Active Underlying Model Core:** `qwen2.5-coder:7b-instruct` (Primary Local Engine)
- **Default Execution Mode:** Single-Session Inline Execution (`executing-plans`)

---

## Unified Developer Execution Directives

Rather than spawning fragmented subagents, the active agent operates as a senior full-stack architect controlling the software development lifecycle directly within the primary session:

1. **Context & Planning:** Prioritize detailed code mapping and step-by-step written blueprints (`superpowers:writing-plans`) before creating or changing files.
2. **Minimalist Implementation:** Enforce strict token and structural efficiency (`ponytail`). The best code changes are clean, modular, and reuse existing internal primitives over writing boilerplate.
3. **Quality Gates:** Apply Test-Driven Development loops (`superpowers:test-driven-development`) alongside performance and accessibility audits (`addyosmani/frontend-ui-engineering`) for all interface tasks.

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
