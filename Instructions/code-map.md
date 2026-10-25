# Current Code Map

Paths below describe the current implementation of the [architecture](architecture.md). Verify them before editing and update this map after moves. Generated `bin`/`obj`, dependency folders, and bundled AI skills are not application code.

## Backend Entry Points

The [solution](../../Backend/ShinigaCim.sln) contains `Api`, `Service`, `Data`, `Domain`, and the `Adapter` project directly under `Backend`. Its project and assembly names omit the `ShinigaCim` prefix. The restricted Security source retains its original namespace.

| Current location                                                                                             | Responsibility                                                                                                         |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| [Api/Program.cs](../../Backend/Api/Program.cs)                                                               | Dependency injection, EF Core, JWT, CORS, Swagger, middleware, startup seeding                                         |
| [Api/Controllers](../../Backend/Api/Controllers)                                                             | HTTP endpoints for authentication, posts, comments, reactions, media, admin user management, and admin post moderation |
| [Api/Authorization/RequireAdminAttribute.cs](../../Backend/Api/Authorization/RequireAdminAttribute.cs)       | Role-check decorator; endpoints must carry an admin-role token                                                         |
| [Api/Implementations/CurrentUserContext.cs](../../Backend/Api/Implementations/CurrentUserContext.cs)         | HTTP identity and audit actor adapter                                                                                  |
| [Api/Middleware/ExceptionHandlingMiddleware.cs](../../Backend/Api/Middleware/ExceptionHandlingMiddleware.cs) | Converts failures into problem-details responses                                                                       |
| [Api/Core/DataSeeder.cs](../../Backend/Api/Core/DataSeeder.cs)                                               | Startup seeding                                                                                                        |
| [Service/Interfaces](../../Backend/Service/Interfaces)                                                       | Service contracts, current-user abstraction, strongly typed IMapper                                                    |
| [Service/Implementations](../../Backend/Service/Implementations)                                             | Business workflows, token handling, mapper implementation                                                              |
| [Service/Models](../../Backend/Service/Models)                                                               | DTOs only                                                                                                              |
| [Service/Requests](../../Backend/Service/Requests)                                                           | Validated input contracts grouped by feature                                                                           |
| [Service/Responses](../../Backend/Service/Responses)                                                         | Authentication and paged-feed responses                                                                                |
| [Service/Mappings](../../Backend/Service/Mappings)                                                           | Entity/DTO/contract mapping definitions                                                                                |
| [Service/Exceptions](../../Backend/Service/Exceptions)                                                       | Typed workflow errors                                                                                                  |
| [Service/Options/JwtOptions.cs](../../Backend/Service/Options/JwtOptions.cs)                                 | JWT configuration                                                                                                      |
| [Service/Core/Constants.cs](../../Backend/Service/Core/Constants.cs)                                         | Shared auth and role constants                                                                                         |
| [Data/ApplicationDbContext.cs](../../Backend/Data/ApplicationDbContext.cs)                                   | EF entities, query filters, audit stamping, async persistence                                                          |
| [Data/Interfaces/IAuditActorProvider.cs](../../Backend/Data/Interfaces/IAuditActorProvider.cs)               | Audit actor contract                                                                                                   |
| [Data/Migrations](../../Backend/Data/Migrations)                                                             | Database schema history; initial migration targets a fresh database                                                    |
| [Domain/Entities](../../Backend/Domain/Entities)                                                             | One entity/base class per file                                                                                         |
| [Domain/Enums](../../Backend/Domain/Enums)                                                                   | One enum per file                                                                                                      |
| [Adapter/Interfaces](../../Backend/Adapter/Interfaces)                                                       | Media storage contract                                                                                                 |
| [Adapter/Implementations](../../Backend/Adapter/Implementations)                                             | Filesystem media storage                                                                                               |
| [Adapter/Storage](../../Backend/Adapter/Storage)                                                             | Storage options, media kinds, stored-file result                                                                       |

Current project references: `Api -> Service, Domain, Data, Adapter`; `Service -> Domain, Data, Adapter`; `Data -> Domain`; `Adapter -> Domain, Data`. No lower layer references `Api`.

## Backend Feature Routing

| Feature                              | Start in Api/Controllers | Continue in Service/Implementations            |
| ------------------------------------ | ------------------------ | ---------------------------------------------- |
| Registration, login, refresh, logout | `AuthController.cs`      | `AuthService.cs`, `TokenService.cs`            |
| Feed and post CRUD                   | `PostsController.cs`     | `PostService.cs`                               |
| Comment listing and CRUD             | `CommentsController.cs`  | `CommentService.cs`                            |
| Reactions                            | `ReactionsController.cs` | `ReactionService.cs`                           |
| File access, delete, restore         | `MediaController.cs`     | `MediaService.cs`, then infrastructure storage |
| Admin user list, approve, delete     | `UsersController.cs`     | `UserService.cs`                               |

Resolve controller and service filenames relative to the linked folders above. Current-user identity comes from the API adapter, not a dependency from Service back to Api.

- Request flow: controller -> service -> DbContext and/or media storage -> response.
- Admin endpoints use `[RequireAdmin]`, backed by the `AdminOnly` authorization policy on the `role` claim.
- Account lifecycle: registration stores `role = User`, `status = PendingApproval`; admin approval activates the account, and soft delete revokes its refresh tokens.
- Mapping flow: service -> `IMapper` -> `Mapper` -> feature mapping definitions. EF aggregate projections remain in queries for database translation.
- Authentication: JWT access tokens plus rotating opaque refresh tokens; refresh-token hashes are persisted server-side.
- Passwords: registration and first-time admin seeding store plaintext in `users.password` (`varchar(128)`); login compares exact values. This is unsafe for production. Existing accounts are not overwritten or converted.
- Persistence: users, posts, media metadata, comments, reactions, and refresh tokens. Media binaries remain on disk.
- DbContext centralizes audit stamping and soft-delete filters. Persistence is async-only; synchronous `SaveChanges` is rejected.
- Post/Media operations coordinate database changes with filesystem changes and compensation on failure. Preserve both sides when editing.
- Startup runs seeding and may migrate the database according to configuration; launching the API is not a read-only validation step.

## Frontend Entry Points

| Location                                                                                            | Responsibility                                                                                                                            |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [src/main.tsx](../../Frontend/src/main.tsx)                                                         | React entry point                                                                                                                         |
| [src/App.tsx](../../Frontend/src/App.tsx)                                                           | Query provider, routing, protected home, login, and register                                                                              |
| [src/services/api.ts](../../Frontend/src/services/api.ts)                                           | Fetch wrapper, bearer token, problem parsing, single-flight refresh and retry                                                             |
| [src/services/authService.ts](../../Frontend/src/services/authService.ts)                           | Authentication (register, login, refresh, logout) and profile API calls                                                                   |
| [src/services/postService.ts](../../Frontend/src/services/postService.ts)                           | Posts, comments, reactions, and admin post-listing/restore/purge API calls                                                                |
| [src/services/userService.ts](../../Frontend/src/services/userService.ts)                           | Admin user list, approve, and delete API calls                                                                                            |
| [src/store/authStore.ts](../../Frontend/src/store/authStore.ts)                                     | Persisted Zustand session                                                                                                                 |
| [src/hooks/useFeed.ts](../../Frontend/src/hooks/useFeed.ts)                                         | Infinite feed query and paging                                                                                                            |
| [src/pages](../../Frontend/src/pages)                                                               | Home, login, register, admin user-management, and admin post-management screens                                                           |
| [src/pages/admin/AdminMediaPreview.tsx](../../Frontend/src/pages/admin/AdminMediaPreview.tsx)       | Modal image/video preview with navigation and error state for active and deleted admin posts                                              |
| [src/components/feed](../../Frontend/src/components/feed)                                           | Post cards, creation, media gallery, comments, reactions                                                                                  |
| [src/components/feed/DeletePostDialog.tsx](../../Frontend/src/components/feed/DeletePostDialog.tsx) | Admin feed deletion dialog with soft-delete warning, explicit permanent-delete confirmation, busy/error state, and dismiss/focus handling |
| [src/components/ui/ConfirmationDialog.tsx](../../Frontend/src/components/ui/ConfirmationDialog.tsx) | Shared async confirmation popup for post deletion/restoration and user approval/deletion; dismiss, focus, busy and error handling         |
| [src/components/feed/PostViewer.tsx](../../Frontend/src/components/feed/PostViewer.tsx)             | Single-post home viewer, arrow/keyboard navigation, image-edge post navigation, and on-demand feed paging; drag/swipe disabled            |
| [src/components/layout](../../Frontend/src/components/layout)                                       | Shared authenticated shell, Header, Footer, Brand link, and login/feed CommunityIntro                                                      |
| [src/components/ui](../../Frontend/src/components/ui)                                               | Shared controls and status components; UI icons use named imports from lucide-react                                                       |
| [src/styles/global.css](../../Frontend/src/styles/global.css)                                       | Original Zenith AI-inspired theme tokens, shared controls, decoration, and feed component styles                                          |
| [vite.config.ts](../../Frontend/vite.config.ts)                                                     | Development server, API proxy, frontend test configuration                                                                                |
| [package.json](../../Frontend/package.json)                                                         | Frontend scripts and dependencies                                                                                                         |

UI flow: page/component -> query hook or resource service -> API client -> backend. A 401 triggers a shared refresh, replaces session tokens, and retries once; failed authentication clears the session.

Admin media previews use the existing media file endpoint with `includeDeleted=true`.
The endpoint validates header/query authentication and admin role before bypassing soft-delete
filters, streams deleted files from their stored trash paths without restoring them, and disables
caching. Normal file requests retain active-only filtering.

## Remaining Exceptions and Validation

- The `Security` source under `Backend/Adapter` and helper scripts under `Backend/Scripts` are restricted by organization policy. Do not read or edit them.
- The `Adapter` project is under `Backend/Adapter`; its accessible media-storage interface and implementation are separated.
- Restricted scripts may still reference old project paths; use the direct commands below instead. No claim is made about their compatibility.
- Old prefixed Api/Data/Domain directories may contain pre-refactor build outputs; only the short-name source projects are in the solution.
- The missing backend test-project reference was removed from the solution. No backend test files were changed.
- Build from the workspace root: `dotnet build Backend\ShinigaCim.sln`; Release: `dotnet build Backend\ShinigaCim.sln -c Release --no-restore`.
- Run manually from the workspace root: `dotnet run --project Backend\Api`. Startup mutates the database/Storage; it is not a validation command.
- Never execute backend tests or API verification scripts; see [validation policy](overview.md#backend-validation-no-tests).
