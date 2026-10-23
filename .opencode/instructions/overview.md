# Project Overview

## Purpose and Stack

ShinigaCim is an authenticated social feed with posts, comments, reactions, and filesystem-backed media.

- Backend: ASP.NET Core 8, EF Core, PostgreSQL, JWT authentication.
- Frontend: React, TypeScript, Vite, TanStack Query, and Zustand.
- Start with [README](../../README.md) for setup and [MIGRATION](../../MIGRATION.md) for deployment.

## Guide Index

| Guide | Read when | Maintains |
|---|---|---|
| [Conventions](conventions.md) | Creating or modifying code | Naming, constructors, mapping, comments |
| [Architecture](architecture.md) | Choosing file locations or dependencies | Target layout and ownership |
| [Code map](code-map.md) | Finding existing code or tracing a feature | Current paths and execution flows |

These guides consolidate the former project-structure document and Copilot-specific instructions. They define project policy and override conflicting older documentation.

The architecture guide describes the **target**; the code map describes the **current implementation**. Do not assume a planned folder or project already exists. Apply conventions to new and modified code without unrelated repository-wide migrations.

## Backend Validation: No Tests

- Do not write, add, generate, modify, or run backend tests.
- Do not create backend test projects, fixtures, snapshots, or test dependencies.
- Do not run `dotnet test`, backend test runners, API verification scripts, smoke tests, or integration-test commands, directly or through wrappers.
- Validate backend changes with focused code review and compilation/build checks only. Inspect scripts before invoking them to ensure they do not run tests.
- Older README test commands do not override this restriction. Frontend tests remain permitted.

## Maintaining These Guides

- Keep each rule in its owning guide; link to it rather than copying it.
- Update the code map when entry points, feature ownership, or paths change.
- Update architecture when an approved boundary changes. Moving code requires updating solution entries, project references, scripts, configuration, and affected documentation.
- Do not treat missing documented scripts or planned infrastructure as existing files; verify before using them.
