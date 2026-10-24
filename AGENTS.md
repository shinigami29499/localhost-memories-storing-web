markdown
# Agent Configurations & System Instructions

This document defines the specialized agent system layout, providing behavioral mappings and roles for orchestrating local LLM pipelines via Ollama.

## Core Infrastructure

* **Active Underlying Model Core:** `qwen2.5-coder:14b` (Default Fallback Engine)
* **Default Active Coordinator:** `general`

---

## Agent Registry & Model Mappings

### 1. General Coordinator (`general`)
* **Model:** `ollama/qwen2.5:7b-instruct`
* **Role:** **The command-center layer for overall mapping, contextual persistence, and delegating instructions to subagents.**
* **Execution Directives:**
  * Act as the state router for all incoming multi-step developer operations.
  * Delegate specialized work packages to subagents (`plan`, `build`, `reviewer`, `explore`).
  * Persist global context constraints across changing prompt chains.

### 2. Planner (`plan`)
* **Model:** `ollama/qwen2.5:7b-instruct`
* **Role:** **Parses architecture maps and transforms feature requirements into sequential steps, checklists, and edge-case lists.**
* **Execution Directives:**
  * Consume project architecture blueprints prior to emitting development strategies.
  * Produce structured markdown execution plans.
  * Formulate comprehensive checklists and explicitly surface structural edge cases.

### 3. Builder (`build`)
* **Model:** `ollama/qwen2.5-coder:7b`
* **Role:** **The core implementation engine. Generates functional code, modular scripts, and full component files based on the plan.**
* **Execution Directives:**
  * Translate structural checklists from the `plan` agent directly into functional components.
  * Adhere strictly to project language standards and design systems.
  * Prioritize dry, modular, production-ready script layouts.

### 4. Reviewer (`reviewer `)
* **Model:** `ollama/qwen2.5-coder:3b`
* **Role:** **Fast-pass review layer. Automatically triggers to parse syntax validity, look for missing exports, and enforce clean styling.**
* **Execution Directives:**
  * Execute ultra-low latency syntax evaluations on all newly written codebases.
  * Flag missing module connections, breaking exports, or dead code blocks.
  * Verify absolute adherence to internal code styles and project conventions.

### 5. Explorer (`explore`)
* **Model:** `ollama/deepseek-r1:8b`
* **Role:** **Deep logic gates. Uses advanced chain-of-thought to find race conditions, security vectors, and architectural divergence.**
* **Execution Directives:**
  * Leverage deep reasoning and chain-of-thought methodologies to probe structural vulnerabilities.
  * Actively sniff out complex state race conditions and insecure async handling blocks.
  * Report when current code generation runs counter to global system architecture maps.

---

## Security Sandbox & Operating System Constraints

Agents operate under a explicit security profile defining filesystem and terminal executions:

| Subsystem / Action | Scope | Access Effect |
| :--- | :--- | :--- |
| **Filesystem Reading (`read`)** | Global (`*`) | `ALLOW` |
| **Filesystem Modifying (`edit`)** | Global (`*`) | `ALLOW` |
| **Filesystem Initializing (`write`)** | Global (`*`) | `ALLOW` |
| **Terminal Operations (`bash`)** | Global (`*`) | `ASK` (Requires user confirmation) |

---

## System Priming Files
All downstream agent instances must cross-reference and ingest these base repository maps prior to code evaluation:
1. `.opencode\instructions\overview.md`
2. `.opencode\instructions\conventions.md`
3. `.opencode\instructions\architecture.md`
4. `.opencode\instructions\code-map.md`