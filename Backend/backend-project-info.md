# Backend Project Reference

Use the [`be-a-overview` skill](../.agents/skills/be-a-overview/SKILL.md) for backend architecture, conventions, invariants, restricted areas, and validation policy. This page is a current-location and implementation reference.

## Current file locations

| Component                    | Current path                                              |
| ---------------------------- | --------------------------------------------------------- |
| Solution                     | `Backend/ShinigaCim.sln`                                  |
| API controllers              | `Backend/Api/Controllers/`                                |
| API middleware               | `Backend/Api/Middleware/`                                 |
| API identity adapter         | `Backend/Api/Implementations/CurrentUserContext.cs`       |
| Admin policy                 | `Backend/Api/Authorization/RequireAdminAttribute.cs`      |
| Business services            | `Backend/Service/Implementations/`                        |
| Service contracts            | `Backend/Service/Interfaces/`                             |
| Service DTOs                 | `Backend/Service/Models/`                                 |
| Service requests/responses   | `Backend/Service/Requests/`, `Backend/Service/Responses/` |
| Entity-DTO mappings          | `Backend/Service/Mappings/`                               |
| Domain entities              | `Backend/Domain/Entities/`                                |
| EF Core DbContext            | `Backend/Data/ApplicationDbContext.cs`                    |
| Migrations                   | `Backend/Data/Migrations/`                                |
| Media storage contract       | `Backend/Adapter/Interfaces/`                             |
| Media storage implementation | `Backend/Adapter/Implementations/`                        |

## Feature request flow

| Feature                                        | Controller               | Service                                    |
| ---------------------------------------------- | ------------------------ | ------------------------------------------ |
| Authentication (register/login/refresh/logout) | `AuthController.cs`      | `AuthService.cs`, `TokenService.cs`        |
| Posts (feed, CRUD)                             | `PostsController.cs`     | `PostService.cs`                           |
| Comments                                       | `CommentsController.cs`  | `CommentService.cs`                        |
| Reactions                                      | `ReactionsController.cs` | `ReactionService.cs`                       |
| Media (file access, delete, restore)           | `MediaController.cs`     | `MediaService.cs` → infrastructure storage |
| Admin user management (list/approve/delete)    | `UsersController.cs`     | `UserService.cs`                           |

The typical path is controller → service → `ApplicationDbContext` and/or media storage → mapped response.

## Runtime configuration

- The API listens on `http://localhost:8000`; Swagger is at `/swagger`.
- PostgreSQL defaults to database `shinigacim_db`. The connection string is in `Backend/Api/appsettings.json` and can be overridden through normal ASP.NET configuration.
- `MediaStorage:Root` defaults to the backend storage tree. Active files and trash files must both remain available to support restoration.
- Seed settings are in appsettings; existing local accounts are not overwritten by seeding.

For shared guidance, see [architecture.md](../Instructions/architecture.md) and [conventions.md](../Instructions/conventions.md).
