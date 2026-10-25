# Project Overview

## Purpose and stack

ShinigaCim is an authenticated social feed with posts, comments, reactions, and filesystem-backed media.

- Backend: ASP.NET Core 8, EF Core, PostgreSQL, and JWT authentication.
- Frontend: React, TypeScript, Vite, TanStack Query, and Zustand.
- Start with [README](../../README.md) for setup and [MIGRATION](../../MIGRATION.md) for deployment.

## Guide index

| Guide                                                               | Read when                                                      | Maintains                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| [Conventions](conventions.md)                                       | Creating or modifying code                                     | Shared naming and comment guidance                             |
| [Architecture](architecture.md)                                     | Choosing cross-stack boundaries or deployment locations        | Shared ownership and configuration notes                       |
| [Backend project info](../Backend/backend-project-info.md)          | Backend work requiring exact file locations or detailed flows  | Current backend paths and domain-specific details              |
| [Frontend project info](../Frontend/frontend-project-info.md)       | Frontend work requiring exact file locations or detailed flows | Current frontend paths and domain-specific details             |
| [Backend overview skill](../.agents/skills/be-a-overview/SKILL.md)  | Any backend work                                               | Backend architecture, conventions, constraints, and validation |
| [Frontend overview skill](../.agents/skills/fe-a-overview/SKILL.md) | Any frontend work                                              | Frontend architecture, conventions, flows, and validation      |

Stack-specific architecture, conventions, and validation policy live in the matching overview skill. These skills are the first reference for work in their respective stacks. The project-info guides provide a more detailed current file map and workflows when needed.

Do not assume a planned folder or project already exists. Apply conventions to new and modified code without unrelated repository-wide migrations.

## Agent workflow

1. Identify whether the task affects the backend, frontend, or both.
2. Load the matching overview skill(s): `.agents/skills/be-a-overview/` for backend work and `.agents/skills/fe-a-overview/` for frontend work. Load both for full-stack work.
3. Load a listed child skill only when it matches the task.
4. Consult the linked project-info guide and shared guides when needed.

See [AGENTS.md](../AGENTS.md) for the repository workflow.

## Backend validation

Backend test restrictions, allowed validation, and API startup side effects are documented in the [backend overview](../.agents/skills/be-a-overview/SKILL.md#validation). Frontend tests remain permitted.

## Maintaining these guides

- Keep each rule in its owning guide; link to it rather than copying it.
- Update the relevant stack overview and project-info guide when approved changes affect ownership, entry points, or documented paths.
- Moving code requires updating solution entries, project references, scripts, configuration, and affected documentation.
- Do not treat missing documented scripts or planned infrastructure as existing files; verify before using them.
