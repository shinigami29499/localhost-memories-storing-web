# Backend Project Reference

Use the [`be-a-overview` skill](../.agents/skills/be-a-overview/SKILL.md) for backend architecture, conventions, invariants, restricted areas, and validation policy. This page is a current-location and implementation reference.

## Current file locations

| Component                      | Current path                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------- |
| Solution                       | `Backend/ShinigaCim.sln`                                                          |
| Infrastructure project         | `Backend/Infrastructures/Infrastructures.csproj`                                  |
| C# namespace roots             | `Apis`, `Services`, `Domains`, `Infrastructures.Data`, `Infrastructures.Adapters` |
| API controllers                | `Backend/Apis/Controllers/`                                                       |
| API middleware                 | `Backend/Apis/Middleware/`                                                        |
| API identity contract          | `Backend/Apis/Interfaces/ICurrentUserContext.cs`                                  |
| API identity adapter           | `Backend/Apis/Implementations/CurrentUserContext.cs`                              |
| Admin policy                   | `Backend/Apis/Authorization/RequireAdminAttribute.cs`                             |
| Application utility services   | `Backend/Services/Implementations/`                                               |
| Public use-case contracts      | `Backend/Services/Interfaces/`                                                    |
| Data-backed workflow services  | `Backend/Infrastructures/Data/ApplicationServices/`                               |
| Data-owned interfaces          | `Backend/Infrastructures/Data/Interfaces/`                                        |
| Service DTOs                   | `Backend/Services/Models/`                                                        |
| Service requests/responses     | `Backend/Services/Requests/`, `Backend/Services/Responses/`                       |
| Entity-DTO mappings            | `Backend/Services/Mappings/`                                                      |
| Domain entities                | `Backend/Domains/Entities/`                                                       |
| EF Core DbContext              | `Backend/Infrastructures/Data/ApplicationDbContext.cs`                            |
| Migrations                     | `Backend/Infrastructures/Data/Migrations/`                                        |
| Media storage application port | `Backend/Services/Interfaces/IMediaStorage.cs`                                    |
| Media storage adapter contract | `Backend/Infrastructures/Adapters/Interfaces/IMediaStorageService.cs`             |
| Media storage implementation   | `Backend/Infrastructures/Adapters/Implementations/`                               |
| Persistence implementations    | `Backend/Infrastructures/Data/Implementations/`                                   |

## Architecture and project references

The backend keeps public use-case contracts in `Services/Interfaces/`; persistence and transaction interfaces are owned by the Infrastructures project's Data area. Workflow implementations that consume those Data-owned interfaces live in `Infrastructures/Data/ApplicationServices/`. Data and Adapters are source areas within one `Infrastructures.csproj`, not separate projects. `Apis/Program.cs` composes the projects:

```text
Apis ──> Services, Infrastructures, Domains
Infrastructures ──> Services, Domains
Services ──> Domains
Domains ──> (no project references)
```

| Project            | Owns                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `Apis/`            | HTTP concerns, startup, configuration, and dependency-injection composition                                                             |
| `Services/`        | Public use-case contracts, shared application contracts, DTOs, requests/responses, mappings, and application options                    |
| `Domains/`         | Entities, enums, and domain behavior                                                                                                    |
| `Infrastructures/` | Data: persistence contracts, implementations, workflows, DbContext and migrations; Adapters: filesystem media storage and configuration |

`Services/` must not reference infrastructure or API projects and must not expose EF Core query types. Persistence repositories, `IUnitOfWork`, `IDataTransaction`, and `IAuditActorProvider` are owned by `Infrastructures/Data/Interfaces/`; the workflow implementations that consume them are in `Infrastructures/Data/ApplicationServices/` and registered by Data. `Services/` owns public use-case interfaces and shared application contracts. `Infrastructures/Adapters/` owns its `IMediaStorageService` interface in `Interfaces/` (extending the shared media storage contract) and implements it with `MediaStorageService`; the API registers both interfaces against the same singleton. `ICurrentUserContext` is owned by `Apis/Interfaces/` because it defines an API authentication context consumed by controllers. The API's `CurrentUserContext` supplies the authenticated actor through the Data-owned audit interface.

Each interface lives under an `Interfaces/` folder in its owning project or source area: API-specific contracts under `Apis/Interfaces/`, public use-case and shared application contracts under `Services/Interfaces/`, persistence and transaction contracts under `Infrastructures/Data/Interfaces/`, and adapter-specific contracts under `Infrastructures/Adapters/Interfaces/`. Workflow implementations that use Data-owned contracts are hosted by the Data area; their public interfaces remain in Services. Infrastructure implementation classes use role-based names such as `PostRepository` and `UnitOfWork`, without an `Ef` prefix. `Backend/Adapter/Security/` remains at its legacy location because it is restricted; the Infrastructures project links its sources in place rather than moving or editing them. Nested `bin/` and `obj/` directories are excluded from project items so previous per-area build outputs cannot be compiled into the merged project.

The Infrastructures project's Data area hosts workflow orchestration that coordinates its repositories and unit of work, alongside EF queries, query filters, projections, bulk interaction updates, and post-purge transactions. The API controllers normally call public service contracts; `MediaController` retains HTTP/JWT responsibilities but delegates media lookup, storage access, and streaming content acquisition to `IMediaService`.

## Feature request flow

| Feature                                        | Controller               | Application service / infrastructure boundary                                                                                |
| ---------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Authentication (register/login/refresh/logout) | `AuthController.cs`      | `Data/ApplicationServices/AuthService.cs`, `Services/Implementations/TokenService.cs`, and Data-owned persistence interfaces |
| Posts (feed, CRUD)                             | `PostsController.cs`     | `Data/ApplicationServices/PostService.cs` → Data repositories and media storage port                                         |
| Comments                                       | `CommentsController.cs`  | `Data/ApplicationServices/CommentService.cs` → Data repository and transaction interfaces                                    |
| Reactions                                      | `ReactionsController.cs` | `Data/ApplicationServices/ReactionService.cs` → Data repository and transaction interfaces                                   |
| Media (file access, delete, restore)           | `MediaController.cs`     | `Data/ApplicationServices/MediaService.cs` → Data repository, transaction, and media storage port                            |
| Admin user management (list/approve/delete)    | `UsersController.cs`     | `Data/ApplicationServices/UserService.cs` → Data repository and transaction interfaces                                       |

Repositories return domain entities or query results; workflows do not compose EF queries. `IUnitOfWork` provides asynchronous save and transaction operations without exposing EF Core transaction types.

## Runtime configuration

- The API listens on `http://localhost:8000`; Swagger is at `/swagger`.
- PostgreSQL defaults to database `shinigacim_db`. The connection string is in `Backend/Apis/appsettings.json` and can be overridden through normal ASP.NET configuration.
- `MediaStorage:Root` defaults to the backend storage tree. Active files and trash files must both remain available to support restoration.
- Seed settings are in appsettings; existing local accounts are not overwritten by seeding.

For shared guidance, see [architecture.md](../Instructions/architecture.md) and [conventions.md](../Instructions/conventions.md).
