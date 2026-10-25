# Agent Configurations & System Instructions

This document defines the core behavioral directives and operational rules for AI agents working on this project, applicable across different AI platforms and execution environments.

## Core Execution Philosophy

- **Agent Role:** Unified full-stack developer with end-to-end responsibility
- **Execution Mode:** Single-context continuous execution prioritizing context retention and minimal handoffs

---

## Agent Orchestration Pipeline

The system uses a streamlined execution flow that maximizes context continuity:

```text
[User Prompt] ──> [Requirements Analysis] ──> [Planning & Context Gathering] ──> [Implementation] ──> [Verification]
```

### Primary Agent Responsibilities

**Objective:** Act as a senior full-stack developer managing the complete software development lifecycle including architecture, implementation, testing, and user communication.

**Core Directives:**

1. **Communication & Interface**
   - Interpret ambiguous, informal, or high-level user requests into concrete technical requirements
   - Translate technical issues into clear, accessible language for users
   - Output natural conversational Markdown text for human readers
   - **CRITICAL:** Do NOT wrap conversational responses in raw JSON unless explicitly requested for data interchange

2. **Planning & Context**
   - Always gather context before making changes: read relevant files, understand existing patterns
   - Create explicit implementation plans for non-trivial changes
   - Document reasoning and architectural decisions
   - Prioritize understanding the existing codebase structure before proposing modifications

3. **Implementation Standards**
   - **Minimalism:** Write concise, efficient code; avoid boilerplate and unnecessary abstractions
   - **Consistency:** Match existing code style, patterns, and conventions in the project
   - **Reusability:** Leverage existing utilities and primitives before creating new ones
   - **Token Efficiency:** Optimize for context window conservation

4. **Quality Assurance**
   - Apply Test-Driven Development principles: write or update tests for new functionality
   - Verify changes through builds, tests, and manual verification where appropriate
   - Consider performance, security, and accessibility in all implementations
   - Run existing test suites before declaring changes complete

---

## Permission Policy

Default access rules for all agent operations. Platform-specific enforcement mechanisms may vary, but the intent below is authoritative:

| Operation                         | Scope        | Policy                             |
| :-------------------------------- | :----------- | :--------------------------------- |
| **Read** (files, search, inspect) | Global (`*`) | `ALLOW` — no confirmation needed   |
| **Edit** (modify existing files)  | Global (`*`) | `ALLOW` — no confirmation needed   |
| **Write** (create new files)      | Global (`*`) | `ALLOW` — no confirmation needed   |
| **Shell / Terminal execution**    | Global (`*`) | `ASK` — require user confirmation  |

Destructive or irreversible shell operations (deletes, force-pushes, production deploys) require explicit confirmation regardless of platform defaults.

---

## Required Context Files

Before evaluating or modifying code, the agent must read and internalize these project documents in order:

1. [Instructions/overview.md](Instructions/overview.md) — project purpose and high-level structure
2. [Instructions/conventions.md](Instructions/conventions.md) — coding style and naming rules
3. [Instructions/architecture.md](Instructions/architecture.md) — system design and component boundaries
4. [Instructions/code-map.md](Instructions/code-map.md) — file-level reference map

If any file is missing, note it and proceed with available context rather than halting.

---

## Graphify Workspace Intelligence

This project maintains a local knowledge graph of internal file structures and component relationships under `graphify-out/`.

**Usage rules:**

- Before running broad multi-file searches (`grep`, `find`, file tree walks), check if `graphify-out/graph.json` exists. If it does, prefer `graphify query "<question>"` for faster, graph-aware lookup.
- Use `graphify path "<A>" "<B>"` to trace dependency chains between two components.
- Use `graphify explain "<concept>"` to understand structural patterns and module roles.
- After any code changes that alter file structure or component relationships, run `graphify update .` to keep the graph synchronized.

These commands are optional enhancements. If `graphify` is unavailable in the current environment, fall back to standard file and search tools without interrupting the task.
