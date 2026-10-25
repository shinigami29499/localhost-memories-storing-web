---
name: be-a-overview
description: "Load for ShinigaCim backend work: ASP.NET Core, C#, EF Core, persistence, API workflows, backend conventions, validation, and restricted areas."
user-invocable: false
---

# Backend Overview

Load this skill for work in `Backend/`. For full-stack work, also load [fe-a-overview](../fe-a-overview/SKILL.md). Read only the relevant child skill and project detail after this overview.

## Stack and architecture

ShinigaCim uses ASP.NET Core 8, EF Core 8 with Npgsql, PostgreSQL, JWT authentication, and local filesystem media storage. Use Clean Architecture principles: separate presentation, application use cases, domain rules, and infrastructure adapters, with dependencies pointing inward toward the application/domain core.

```text
Presentation (Api)
        ↓
Application (Service)
      ↙     ↘
   Domain   Application-owned ports
                 ↑
      Infrastructure (Data, Adapter)
```

| Logical layer  | ShinigaCim project(s) | Responsibility                                                                      |
| -------------- | --------------------- | ----------------------------------------------------------------------------------- |
| Presentation   | `Api/`                | HTTP, controllers, middleware, authorization, composition root                      |
| Application    | `Service/`            | Use cases, orchestration, application contracts, DTOs, validation, mappings         |
| Domain         | `Domain/`             | Entities and business rules; framework and infrastructure independent               |
| Infrastructure | `Data/`, `Adapter/`   | EF Core persistence and external integrations implementing application/domain ports |

Controllers handle HTTP concerns and delegate to application use cases; they should not query the database or invoke infrastructure directly. Application workflows depend on abstractions (ports) for persistence and external services. Infrastructure implements those abstractions, and the API composition root wires implementations into dependency injection. Avoid references from Domain to other layers and from Application to Presentation or Infrastructure.

Keep the existing use-case/service pattern unless a change benefits from a different one. CQRS, MediatR, repositories, and other frameworks are optional design choices, not requirements; introduce them only to solve a concrete need. Apply architectural changes incrementally—do not move projects or rewrite existing flows as part of an unrelated feature.

Reference: [Best-practice architecture for .NET Core projects](https://www.c-sharpcorner.com/article/best-practice-architecture-for-net-core-projects/).

## Backend conventions

- Use PascalCase for types, methods, properties, and enum members; camelCase for parameters and locals.
- Name async methods with the `Async` suffix, DTOs with `Dto`, and service input/output contracts with `Request` or `Response`.
- Prefix interfaces with `I`; put each primary type in its own file and separate `Interfaces/` from `Implementations/`.
- Use C# primary constructors for dependency assignment; do not add empty constructors.
- Keep application ports/contracts owned by the application layer; infrastructure projects implement them rather than making use cases depend on infrastructure implementations.
- Use the existing `IMapper` abstraction and definitions in `Service/Mappings` for entity/DTO/request/response mapping.
- Preserve the current short project and namespace naming; keep the solution filename `ShinigaCim.sln`.
- Keep comments limited to necessary facts or non-obvious constraints.

## Project-specific invariants

- Entities are soft-deleted; `Remove()` is not a physical-delete mechanism. Preserve global soft-delete filters and `DeleteBehavior.NoAction`.
- Persistence must remain async. `ApplicationDbContext` rejects synchronous `SaveChanges` and centrally stamps audit fields from the authenticated actor.
- Admin endpoints use `[RequireAdmin]` and the `AdminOnly` policy.
- Registration creates pending users; approval activates them. Preserve refresh-token rotation and reuse detection.
- Post/media deletion and restoration coordinate database state with filesystem moves; preserve compensation/rollback if either side fails.
- Do not read, edit, or move `Backend/Adapter/Security/` or `Backend/Scripts/`.
- API startup applies migrations/seeding and creates storage directories; do not run it as a read-only check.

## Validation

- Do not add, generate, modify, or run backend tests or test projects.
- Do not run `dotnet test`, backend test runners, API smoke tests, or verification scripts.
- Validate backend changes through focused review and compilation/build checks only.
- From the repository root, build with `dotnet build Backend\ShinigaCim.sln`. Do not use `dotnet run` as a validation command.

## Child skills

Load only the skill matching the backend task:

| Task                        | Skill                                     |
| --------------------------- | ----------------------------------------- |
| Project structure           | `be-b-dotnet-project-structure`           |
| EF Core and database        | `be-b-efcore-patterns`                    |
| C# coding style             | `be-b-csharp-coding-standards`            |
| Async and concurrency       | `be-b-csharp-concurrency-patterns`        |
| Nullable reference types    | `be-b-csharp-nullable-reference-types`    |
| Type design and performance | `be-b-csharp-type-design-performance`     |
| Serialization               | `a-overiew-b-serialization`               |
| Dependency injection        | `be-b-dependency-injection-patterns`      |
| Configuration and options   | `be-b-microsoft-extensions-configuration` |
| Public API compatibility    | `be-b-csharp-api-design`                  |
| Database query performance  | `be-b-database-performance`               |
| General performance         | `a-overiew-b-performance-optimization`    |

## Further details

- [Backend project info](../../../Backend/backend-project-info.md): current file locations, request flow, storage, and database specifics.
- [Conventions](../../../Instructions/conventions.md): shared naming and comment guidance.
- [Architecture](../../../Instructions/architecture.md): shared ownership and target-layout notes.
