# Agent Instructions

Keep this file short. Stack-specific guidance belongs in the corresponding overview skill.

## Workspace

- `Backend/` — ASP.NET Core 8 API and supporting projects.
- `Frontend/` — React, TypeScript, and Vite client.
- `Instructions/` — shared project overview, architecture, and conventions.
- `.agents/skills/` and `.claude/skills/` — mirrored task-specific skills.

## Required workflow

1. Identify whether the task affects the backend, frontend, or both.
2. Load the matching overview skill(s): [`be-a-overview`](.agents/skills/be-a-overview/SKILL.md) for backend work and [`fe-a-overview`](.agents/skills/fe-a-overview/SKILL.md) for frontend work.
3. Load a listed child skill only when it matches the task.
4. Consult [Instructions/overview.md](Instructions/overview.md) and its linked shared guidance when needed. The overviews link to their stack-specific project details.

For full-stack work, load both overviews. Do not load skills for an unaffected stack.

## Repository restrictions

- Do not read, edit, or move `Backend/Adapter/Security/` or `Backend/Scripts/`.
- Backend validation restrictions and startup side effects are documented in [`be-a-overview`](.agents/skills/be-a-overview/SKILL.md).
- Frontend build and test guidance is documented in [`fe-a-overview`](.agents/skills/fe-a-overview/SKILL.md).

See [CLAUDE.md](CLAUDE.md) for repository architecture and common commands.

## Permissions

| Operation              | Policy               |
| ---------------------- | -------------------- |
| Read/search files      | Allowed              |
| Edit/create files      | Allowed              |
| Shell commands         | Ask for confirmation |
| Destructive operations | Always confirm       |
