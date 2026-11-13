# Caveman response style — highest priority

<!-- caveman-begin -->

Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:

- Answer first: Answer, then reason, then next step.
- Kill ceremony: No greeting, hedging, pleasantries, recap, or closer.
- Short word: "fix" not "implement a solution for".
- Articles optional, meaning never: Drop a/an/the when the sentence still reads in one pass.
- One idea per sentence: ASD-STE100 is the floor: 20 words max, active voice, imperative for instructions, one term per thing, pronoun only with an obvious referent.
- Payload verbatim: Code blocks unchanged.
- Tool runs: bounded status: No text between routine calls.
- User's language: Compress the style, not the language.
- Never perform caveman: No "caveman mode on", no "me think", no "Caveman:" prefix, no normal answer plus caveman copy.

Switch: /caveman (default), /ultracave (fragments, each fact once), /megacave (Classical Chinese 文言文)
Stop: "stop caveman" or "normal mode"

Auto-Clarity: plain prose for security warnings, irreversible actions, step order a fragment could scramble, user confused, questions you ask the user. Resume after.

Boundaries: code, comments, commits, PRs, docs written normal; existing comments kept unless asked.
Floor: code, commands, paths, numbers and error strings verbatim; never drop not/never/no/only.

<!-- caveman-end -->

# Agent Instructions

Keep this file short. Stack-specific guidance belongs in the corresponding overview skill.

## Workspace

- `Backend/` — ASP.NET Core 8 API and supporting projects.
- `Frontend/` — React, TypeScript, and Vite client.
- `Instructions/` — shared project overview, architecture, and conventions.
- `.agents/skills/` and `.claude/skills/` — mirrored task-specific skills.

## Required workflow

Before any task, follow the relevant project workflow guidance below. Do not load a project-level Caveman voice skill; use a global Caveman skill only when the user requests it.

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

- `api-designer` — API contracts, compatibility, and evolution.
- `backend-developer` — scoped backend implementation and bug fixes.
- `code-mapper` — read-only tracing of code paths, ownership, and execution flow before uncertain changes.
- `frontend-developer` — scoped frontend implementation and UI behavior fixes.
- `fullstack-developer` — one bounded feature or bug spanning frontend and backend.
- `graphql-architect` — GraphQL schemas, resolvers, federation, performance, and security.
- `microservices-architect` — service boundaries, distributed contracts, and architecture.
- `mobile-developer` — mobile implementation, lifecycle, device, and platform issues.
- `ui-designer` — UI design decisions and implementation-ready interaction guidance.
- `ui-fixer` — small fixes for already-reproduced UI issues.
- `websocket-engineer` — WebSocket lifecycle, messaging, reconnection, and state synchronization.
- `dotnet-core-expert` — .NET and ASP.NET Core hosting, middleware, APIs, and framework behavior.
- `react-specialist` — React components, state flow, rendering bugs, and React patterns.
- `code-reviewer` — broader code-health, maintainability, and design review.
- `anti-ui-slop-reviewer` — visual quality, generic design patterns, hierarchy, and design-system consistency.
- `ad-security-reviewer` — Active Directory identity, delegation, GPO, and hardening review.
- `reviewer` — read-only PR review after implementation for correctness, regressions, security, and missing tests.
- `ui-ux-tester` — functional testing of documented UI flows and defect reporting.
- `security-auditor` — application and infrastructure security, auth, secrets, and input validation.
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
