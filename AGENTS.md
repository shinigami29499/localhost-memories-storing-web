# Agent Instructions

Keep this file short. Stack-specific guidance belongs in the corresponding overview skill.

## Workspace

- `Backend/` — ASP.NET Core 8 API and supporting projects.
- `Frontend/` — React, TypeScript, and Vite client.
- `Instructions/` — shared project overview, architecture, and conventions.
- `.agents/skills/` and `.claude/skills/` — mirrored task-specific skills.

## Required workflow

Before any task, read and follow [the Caveman skill](.agents/skills/01-overview-01-readfirst/SKILL.md). Then continue with the workflow below.

1. Identify whether the task affects the backend, frontend, or both.
2. Load the matching overview skill(s): [`02-be-01-readfirst`](.agents/skills/02-be-01-readfirst/SKILL.md) for backend work and [`03-fe-01-readfirst`](.agents/skills/03-fe-01-readfirst/SKILL.md) for frontend work.
3. Load a listed child skill only when it matches the task.
4. Consult [Instructions/overview.md](Instructions/overview.md) and its linked shared guidance when needed. The overviews link to their stack-specific project details.

For full-stack work, load both overviews. Do not load skills for an unaffected stack.

For UI implementation, layout changes, or visual refinement, use [`03-fe-09-ui-spacing-system`](.agents/skills/03-fe-09-ui-spacing-system/SKILL.md) as the primary spacing, grouping, alignment, and padding guidance. Establish spacing hierarchy before color, depth, and decoration, subject to accessibility, explicit user requirements, and project constraints.

## Repository restrictions

- Do not read, edit, or move `Backend/Adapter/Security/` or `Backend/Scripts/`.
- Run Playwright or browser-driven tests when necessary.
- Backend validation restrictions and startup side effects are documented in [`02-be-01-readfirst`](.agents/skills/02-be-01-readfirst/SKILL.md).
- Frontend build and test guidance is documented in [`03-fe-01-readfirst`](.agents/skills/03-fe-01-readfirst/SKILL.md).

See [CLAUDE.md](CLAUDE.md) for repository architecture and common commands.

## Project subagents

Project subagents follow the Codex-native TOML format used by [VoltAgent's awesome-codex-subagents](https://github.com/VoltAgent/awesome-codex-subagents). Keep project profiles in `.codex/agents/`; these take precedence over global profiles. Refresh the Codex session after changing profiles.

- Use `code-mapper` for read-only path and ownership tracing before uncertain changes.
- Use `backend-developer` or `frontend-developer` for scoped implementation in the matching stack.
- Use `reviewer` for read-only, evidence-based review after implementation.
- Keep agent tasks scoped. Never assign overlapping edits to multiple agents. Main agent owns coordination and final decisions.
- Consult each profile's instructions. Repository restrictions, validation rules, and stack skills in this file still apply to every agent.

Profiles are maintained from VoltAgent's collection. Review upstream before adding or updating profiles: [awesome-codex-subagents](https://github.com/VoltAgent/awesome-codex-subagents).

## Permissions

| Operation         | Policy  |
| ----------------- | ------- |
| Read/search files | Allowed |
| Edit/create files | Allowed |

<!--
| Shell commands         | Ask for confirmation |
| Destructive operations | Always confirm       |
-->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
