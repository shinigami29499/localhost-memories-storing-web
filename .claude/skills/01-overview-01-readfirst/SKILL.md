---
name: 01-overview-01-readfirst
description: "Read first for ShinigaCim tasks to route project guidance and decide whether authorized subagent delegation helps."
user-invocable: false
---

# Project Orchestrator

Read this skill first for every project task. Follow higher-priority instructions and the user's request; this skill does not grant permission to delegate or override tool, sandbox, or repository restrictions.

## Route the work

1. Identify the requested outcome, scope, constraints, and relevant repository guidance. Use the smallest useful inspection to resolve uncertainty.
2. Assess delegation before starting substantive work. Delegate only when the current environment permits it and the user or applicable instructions authorize it. If delegation is unavailable or prohibited, work directly.
3. Identify affected stacks. Load [backend overview](../02-be-01-readfirst/SKILL.md) for backend work, [frontend overview](../03-fe-01-readfirst/SKILL.md) for frontend work, or both for full-stack work. Load matching child skills only when relevant. For UI layout or visual work, use the frontend spacing skill as required by AGENTS.md.
4. Complete the requested work and appropriate validation. Observe the repository restrictions and stack-specific validation rules.

## Decide whether to delegate

Work directly for small, sequential, tightly coupled, or easily verified tasks, or when coordination costs exceed the likely benefit. Do not spawn agents merely because profiles exist.

When delegation is authorized and available, consider it for independent work with a clear boundary: parallel investigations, distinct non-overlapping implementation areas, or an independent review where risk or complexity warrants one. Prefer a project profile suited to the task; consult its instructions. An agent list or available profile alone is not authorization to spawn.

If delegating, give each agent a concrete outcome, relevant context and constraints, and explicit ownership for edits. Avoid overlapping write scopes. Tell editing agents that others may work concurrently and not to revert others' changes. The main agent coordinates dependencies, integrates results, and verifies the final outcome. Apply AGENTS.md and the relevant project skills to delegated work too.
