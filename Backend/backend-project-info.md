# Backend Project Reference

Use the [backend overview skill](../.agents/skills/02-be-01-readfirst/SKILL.md) for backend architecture, conventions, invariants, restricted areas, and validation policy. This page maps the current source, including local changes.

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

Paths in this page are relative to the repository root.

## Source entry points

| Concern | Source |
| --- | --- |
| Composition, JWT, CORS, storage options, hub routing | `Backend/Apis/Program.cs` |
| Startup migrations and seeding | `Backend/Apis/Core/DataSeeder.cs` |
| HTTP exception translation | `Backend/Apis/Middleware/ExceptionHandlingMiddleware.cs` |
| Account avatars | `UsersController` exposes authenticated `GET /api/users/me` and `PUT /api/users/me/avatar` (`{ "seed": "..." }`, 1-128 characters). `UserService` updates only the current account and returns `UserResponse`; auth/user and owner-summary responses include nullable `avatarSeed`. Migration `AddUserAvatarSeed` adds nullable `users.avatar_seed`, preserving existing accounts. Apply through the normal migration workflow before using the updated API; builds do not update the database. |
| Persistence and workflow registration | `Backend/Infrastructures/Data/DependencyInjection/ServiceCollectionExtensions.cs` |
| Application utility registration | `Backend/Services/DependencyInjection/ServiceCollectionExtensions.cs` |
| Mapping implementation and definitions | `Backend/Services/Implementations/Mapper.cs`, `Backend/Services/Mappings/AuthMappings.cs`, `Backend/Services/Mappings/CollectionMappings.cs`, `Backend/Services/Mappings/FoodPlaceMappings.cs` |
| Media access, paging, favorites, trash, restore, purge | `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs`, `Backend/Infrastructures/Data/Implementations/MediaRepository.cs` |
| Photo location updates and backfill | `Backend/Infrastructures/Data/ApplicationServices/MediaService.Location.cs`, `Backend/Services/Models/Media/MediaLocationMetadata.cs` |
| Upload tracking and file completion | `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`, `Backend/Infrastructures/Data/Implementations/UploadRepository.cs` |
| Albums, captions, membership, preview uploads | `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`, `Backend/Infrastructures/Data/Implementations/CollectionRepository.cs` |
| Food places, visits, history, ratings, notes, custom markers | `Backend/Infrastructures/Data/ApplicationServices/FoodPlaceService.cs`, `Backend/Infrastructures/Data/Implementations/FoodPlaceRepository.cs` |
| File storage and trash moves | `Backend/Infrastructures/Adapters/Implementations/MediaStorageService.cs` |
| JPEG previews | `Backend/Infrastructures/Adapters/Implementations/MediaStorageService.Preview.cs` |
| EXIF GPS extraction | `Backend/Infrastructures/Adapters/Implementations/MediaStorageService.Location.cs` |
| Upload realtime groups and delivery | `Backend/Apis/Realtime/NotificationsHub.cs`, `Backend/Apis/Realtime/UploadNotifications.cs` |

Current domain entities are `User`, `RefreshToken`, `MediaFile`, `MediaFavorite`,
`Collection`, `CollectionMedia`, `UploadBatch`, `UploadItem`, `FoodPlace`, and
`FoodPlaceVisit`, alongside
the shared entity bases. Media belongs directly to its uploader through
`MediaFile.OwnerId`; album membership and favorites reference media, not posts.

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

Each interface lives under an `Interfaces/` folder in its owning project or source area: API-specific contracts under `Apis/Interfaces/`, public use-case and shared application contracts under `Services/Interfaces/`, persistence and transaction contracts under `Infrastructures/Data/Interfaces/`, and adapter-specific contracts under `Infrastructures/Adapters/Interfaces/`. Workflow implementations that use Data-owned contracts are hosted by the Data area; their public interfaces remain in Services. Infrastructure implementation classes use role-based names such as `MediaRepository` and `UnitOfWork`, without an `Ef` prefix. `Backend/Adapter/Security/` remains at its legacy location because it is restricted; the Infrastructures project links its sources in place rather than moving or editing them. Nested `bin/` and `obj/` directories are excluded from project items so previous per-area build outputs cannot be compiled into the merged project.

The Infrastructures project's Data area hosts workflow orchestration that coordinates its repositories and unit of work, alongside EF queries, query filters, projections, bulk updates, and media-purge transactions. The API controllers call public service contracts; `MediaController` retains HTTP/JWT responsibilities but delegates media lookup, storage access, and streaming content acquisition to `IMediaService`.

## Feature request flow

| Feature | Controller in `Backend/Apis/Controllers/` | Application boundary / API |
| --- | --- | --- |
| Register, login, refresh, logout, current user | `AuthController.cs` | `IAuthService`, `AuthService`, `TokenService`; `/api/auth` |
| Album lists, details, media, captions, previews | `CollectionsController.cs` | `ICollectionService`, `CollectionService`; `/api/library/album` |
| Media lists, files, trash, restore, purge | `MediaController.cs` | `IMediaService`, `MediaService`; `/api/library/gallery` |
| Media favorites | `MediaFavoritesController.cs` | `IMediaService`; `GET /api/library/gallery/favorites`, `POST`/`DELETE /api/library/gallery/{mediaId}/favorite` |
| Photo locations | `MediaController.cs` | `IMediaService`; `PUT /api/location/travel/{mediaId}`, `POST /api/location/travel/scan` |
| Food places and current-user visit history | `FoodPlacesController.cs` | `IFoodPlaceService`, `FoodPlaceService`; `/api/location/food` |
| Upload batches, queue, progress, file completion | `UploadsController.cs` | `IUploadService`, `UploadService`; `/api/sync/upload` |
| User listing, admin approval/deletion, account home location | `UsersController.cs` | `IUserService`, `UserService`; `/api/users`, `/api/location/food/home-location` |
| Mention candidate lookup | `UserDirectoryController.cs` | `IUserService`; `GET /api/users/directory/mentions` |

New routes follow sidebar groups; previous API paths remain aliases for compatibility.
`GET /api/library/gallery` lists active standalone media across uploaders for signed-in users;
`GET /api/library/gallery/favorites` filters that library to the caller's favorites. Both accept
`offset`, `limit`, and optional `mediaKind` (`image`/`video`), and sort by media creation
time descending. Favorite state is viewer-specific. Deleted-media listing, deletion,
restoration, and permanent deletion are `[RequireAdmin]`.

Repositories return domain entities or query results; workflows do not compose EF queries. `IUnitOfWork` provides asynchronous save and transaction operations without exposing EF Core transaction types.

### Uploads and realtime

`POST /api/sync/upload/batches` registers file metadata. Each item is started, receives
progress updates, and accepts its bytes through
`POST /api/sync/upload/batches/{batchId}/items/{itemId}/file`. Successful completion creates
one standalone `MediaFile` through `IMapper` and commits media metadata with item state.
Batch row locks and item revisions reject conflicting completions; storage cleanup
compensates failed persistence.

Tracking and item actions are owner-scoped. `GET /api/sync/upload/admin/batches` is
admin-only and includes owner names. Both list endpoints accept `createdFrom`
(inclusive) and `createdBefore` (exclusive), normalized to UTC before pagination and
counting. Queue, active-batch, and recovery endpoints support the client upload runtime.

`/hubs/notifications` remains the authenticated SignalR endpoint, but currently
delivers `UploadsChanged` to the owner's group and the admin group. There is no current
post/comment/reaction notification API; browser upload notifications are client-local.

### Albums

Collections are albums in the client. They are owned by one user and private by default.
`scope=mine` lists owned albums; `scope=public` lists other users' public albums.
Signed-in viewers can read public albums and update their captions through
`PUT /api/library/album/{collectionId}/caption` (maximum 4,000 characters).
Only owners can change other album details, upload previews, or add/remove media.
Owners and administrators can delete albums without deleting their media files.
Private albums return 404 to other viewers; owner-only edits reject non-owners.

`CollectionMedia` stores album membership. `PreviewMediaId` uses the selected
`Collection.PreviewMediaFileId` when valid, otherwise the first active image in saved
order. `PreviewIsFavorited` is viewer-specific and fetched in one batch for album lists.
Preview uploads create standalone media, add it to the album, and select it as preview
in one transaction. Removing selected preview media clears the preview reference.
Soft-deleted media disappears from album results and returns after restoration;
permanent deletion removes membership, favorites, and preview references.

### Food places

`FoodPlace` records a map-based food location with a name (maximum 120 characters),
an optional address (maximum 300 characters), a note (maximum 2,000 characters),
latitude/longitude, a rating, and marker styling.
`Rating` is 1 to 5 stars, or 0 when the place is unrated. `MarkerIcon` is a short emoji
or glyph (maximum 16 characters) and `MarkerColor` is a `#RGB` or `#RRGGBB` hex color;
both fall back to defaults when omitted. Every signed-in user can read all food places
through `GET /api/location/food`; only the owner or an administrator can update or delete
one. Deletion is a soft delete, like every other entity.

`FoodPlaceMedia` links a food place to up to 12 active library images in display order;
the lowest `Position` is the cover. `SaveFoodPlaceRequest.MediaIds` replaces the links in
the given order (duplicates are ignored), or keeps them unchanged when omitted.
`FoodPlaceDto.MediaIds` lists only active images, so trashed or deleted media drop out.
Deleting a food place soft-deletes its links.

Every signed-in user can record repeat visits through
`POST /api/location/food/{foodPlaceId}/visits`. `GET /api/location/food/visits` returns
only that user's visits, newest first. The visit timestamp comes from the audit
`CreatedAt` value. History retains place details after a food place is soft-deleted.

Each account stores one optional home coordinate on `User`. Authenticated users read
and update only their own location through `GET` and `PUT /api/location/food/home-location`;
`DELETE` clears it.

### Locations and previews

`MediaStorageService.Location.cs` reads image EXIF GPS using MetadataExtractor during
uploads and backfill scans. `MediaLocationMetadata` stores `location` and
`locationScanned` in the existing media metadata JSON; no location-specific migration
is required. Owners or admins can set valid latitude/longitude pairs or clear both.
Scans process up to 25 unscanned active photos per request (own photos for members,
all photos for admins), returning counts, failed IDs, and a continuation offset.
Manual location changes mark photos scanned so concurrent backfill cannot overwrite them.

`GET /api/library/gallery/{mediaId}/file` accepts a bearer token or `accessToken` query parameter.
`preview=true` requests a JPEG bounded by 640 x 640 pixels; preview generation uses
FFmpeg. `includeDeleted=true` requires an admin token and serves trash without restoring
it. Both previews and deleted-file responses use `Cache-Control: no-store`.

### Schema history

`AddMediaLevelAlbumFavorites` introduced media album membership and favorites.
`RemovePostFeatures` then removed posts, comments, reactions, persisted post
notifications, and upload-to-post links, transferring media ownership to users.
`AddCollectionCaption` adds album captions. `AddFoodPlaces` adds the `food_places`
table for map-based food places with rating, note, and marker columns.
`AddFoodPlaceMedia` adds the ordered `food_place_media` image links.
`AddFoodPlaceAddress` adds an optional address to `food_places`. Earlier post-related
migrations remain historical steps, not active API documentation.
`AddUserHomeLocation` adds nullable home coordinates to `users`. The model snapshot is
`Backend/Infrastructures/Data/Migrations/ApplicationDbContextModelSnapshot.cs`.
`AddFoodPlaceVisits` adds per-user visit records for food places.

## Runtime configuration

- The API listens on `http://localhost:8000`; Swagger is at `/swagger`.
- PostgreSQL defaults to database `shinigacim_db`. The connection string is in `Backend/Apis/appsettings.json` and can be overridden through normal ASP.NET configuration.
- `MediaStorage:Root` defaults to the backend storage tree. Active files and trash files must both remain available to support restoration.
- Seed settings are in appsettings; existing local accounts are not overwritten by seeding.

For shared guidance, see [architecture.md](../Instructions/architecture.md) and [conventions.md](../Instructions/conventions.md).
