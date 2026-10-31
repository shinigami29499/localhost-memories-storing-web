---
name: 02-be-01-readfirst
description: "Load for ShinigaCim backend work: ASP.NET Core, C#, EF Core, persistence, API workflows, backend conventions, validation, and restricted areas."
user-invocable: false
---

# Backend Overview

Load this skill for work in `Backend/`. For full-stack work, also load [03-fe-01-readfirst](../03-fe-01-readfirst/SKILL.md). Read only the relevant child skill and project detail after this overview.

## Stack and architecture

ShinigaCim uses ASP.NET Core 8, EF Core 8 with Npgsql, PostgreSQL, JWT authentication, and local filesystem media storage. Use Clean Architecture principles: separate presentation, application use cases, domain rules, and infrastructure adapters, with dependencies pointing inward toward the application/domain core.

```text
Presentation (Apis)
        ↓
Application (Services)
      ↙     ↘
  Domains   Application-owned ports
                 ↑
       Infrastructures
          ↙       ↘
       Data      Adapters
```

Use plural names for the layer directories, and group infrastructure projects beneath one `Infrastructures/` directory:

```text
Backend/
├── Apis/
├── Services/
├── Domains/
└── Infrastructures/
    ├── Data/
    └── Adapters/
```

| Logical layer  | Project directory                                    | Responsibility                                                              |
| -------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Presentation   | `Apis/`                                              | HTTP, controllers, middleware, authorization, composition root              |
| Application    | `Services/`                                          | Use cases, orchestration, application contracts, DTOs, validation, mappings |
| Domain         | `Domains/`                                           | Entities and business rules; framework and infrastructure independent       |
| Infrastructure | `Infrastructures/Data/`, `Infrastructures/Adapters/` | Persistence and external integrations implementing application/domain ports |

Controllers handle HTTP concerns and delegate to application use cases; they should not query the database or invoke infrastructure directly. Application workflows depend on abstractions (ports) for persistence and external services. Infrastructure implements those abstractions, and the API composition root wires implementations into dependency injection. Avoid references from Domain to other layers and from Application to Presentation or Infrastructure.

Keep the existing use-case/service pattern unless a change benefits from a different one. CQRS, MediatR, repositories, and other frameworks are optional design choices, not requirements; introduce them only to solve a concrete need. Apply architectural changes incrementally—do not move projects or rewrite existing flows as part of an unrelated feature.

## Backend conventions

- Use PascalCase for types, methods, properties, and enum members; camelCase for parameters and locals.
- Name async methods with the `Async` suffix, DTOs with `Dto`, and service input/output contracts with `Request` or `Response`.
- Prefix interfaces with `I`; every interface belongs in an `Interfaces/` folder inside the project that owns it. Keep the interface and its owning implementation in the same project when they define that project's API—for example, `IMediaStorageService` belongs in `Infrastructures/Adapters/Interfaces/` alongside `MediaStorageService`. Do not put a project's interface in another project's `Interfaces/` folder.
- Name infrastructure implementations for their role (for example, `UnitOfWork`, `PostRepository`, `MediaStorageService`); do not add technology prefixes such as `Ef`.
- Use C# primary constructors for dependency assignment; do not add empty constructors.
- Keep use-case ports owned by the application layer when application workflows depend on them; place those interfaces in `Services/Interfaces/`. Interfaces that define an infrastructure project's own API belong in that infrastructure project's `Interfaces/` folder.
- Use the existing `IMapper` abstraction and definitions in `Services/Mappings` for entity/DTO/request/response mapping.
- Preserve the current short project and namespace naming; keep the solution filename `ShinigaCim.sln`.
- Keep comments limited to necessary facts or non-obvious constraints.

## Current API surface

- Controllers expose authentication, collections, media and favorites, uploads, and user workflows. Keep HTTP concerns in `Apis/Controllers/` and delegate use cases through application-owned interfaces.
- Collection workflows live in `Infrastructures/Data/ApplicationServices/`; persistence contracts and implementations belong to the Data area. Media storage remains an adapter behind application-owned contracts.

## Project-specific invariants

- Entities are soft-deleted; `Remove()` is not a physical-delete mechanism. Preserve global soft-delete filters and `DeleteBehavior.NoAction`.
- Persistence must remain async. `ApplicationDbContext` rejects synchronous `SaveChanges` and centrally stamps audit fields from the authenticated actor.
- Admin endpoints use `[RequireAdmin]` and the `AdminOnly` policy.
- Registration creates pending users; approval activates them. Preserve refresh-token rotation and reuse detection.
- Media deletion and restoration coordinate database state with filesystem moves; preserve compensation/rollback if either side fails. Collections and entries follow soft-delete behavior.
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
| Project structure           | `02-be-09-dotnet-structure`           |
| EF Core and database        | `02-be-10-efcore`                    |
| C# coding style             | `02-be-03-csharp-standards`            |
| Async and concurrency       | `02-be-04-concurrency`        |
| Nullable reference types    | `02-be-05-nullability`    |
| Type design and performance | `02-be-06-type-performance`     |
| Serialization               | `01-overview-04-serialization`               |
| Dependency injection        | `02-be-08-dependency-injection`      |
| Configuration and options   | `02-be-11-configuration` |
| Public API compatibility    | `02-be-02-api-design`                  |
| Database query performance  | `02-be-07-database-performance`               |
| General performance         | `01-overview-03-performance`    |

## Further details

- [Backend project info](../../../Backend/backend-project-info.md): current file locations, request flow, storage, and database specifics.
- [Conventions](../../../Instructions/conventions.md): shared naming and comment guidance.
- [Architecture](../../../Instructions/architecture.md): shared ownership and target-layout notes.
