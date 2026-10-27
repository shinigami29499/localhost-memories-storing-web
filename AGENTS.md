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

## Repository restrictions

- Do not read, edit, or move `Backend/Adapter/Security/` or `Backend/Scripts/`.
- Backend validation restrictions and startup side effects are documented in [`02-be-01-readfirst`](.agents/skills/02-be-01-readfirst/SKILL.md).
- Frontend build and test guidance is documented in [`03-fe-01-readfirst`](.agents/skills/03-fe-01-readfirst/SKILL.md).

See [CLAUDE.md](CLAUDE.md) for repository architecture and common commands.

## Permissions

| Operation              | Policy               |
| ---------------------- | -------------------- |
| Read/search files      | Allowed              |
| Edit/create files      | Allowed              |
| Shell commands         | Ask for confirmation |
| Destructive operations | Always confirm       |
