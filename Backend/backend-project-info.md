# Backend Project Reference

Use the [backend overview skill](../.agents/skills/02-be-01-readfirst/SKILL.md) for architecture, conventions, restrictions, and validation guidance. Paths below are relative to `Backend/`.

## Source map

| Area             | Path                        | Responsibility                                                            |
| ---------------- | --------------------------- | ------------------------------------------------------------------------- |
| Solution         | `ShinigaCim.sln`            | Backend projects                                                          |
| API              | `Apis/`                     | HTTP endpoints, middleware, authorization, realtime delivery, and startup |
| Composition root | `Apis/Program.cs`           | Configuration and dependency registration                                 |
| Application      | `Services/`                 | Use-case contracts, models, mappings, and shared application services     |
| Domain           | `Domains/`                  | Entities, enums, and domain behavior                                      |
| Infrastructure   | `Infrastructures/`          | Persistence and external adapters                                         |
| Data             | `Infrastructures/Data/`     | Database context, migrations, persistence, and data-backed workflows      |
| Adapters         | `Infrastructures/Adapters/` | Storage and other infrastructure implementations                          |

## General flow

Requests enter the API and pass through controllers to application contracts. Services coordinate domain behavior and infrastructure operations. The API composition root registers dependencies. Persistence and external adapters provide their implementations.

Project dependencies point from the API to the application, domain, and infrastructure projects; infrastructure depends on application and domain; application depends on domain.
