# ShinigaCim — Local Media-Sharing Site

A locally hosted media-sharing web application: registered users upload images/Videos to a
feed, comment, react, and manage their own posts. The backend is an ASP.NET Core 8 Web API
backed by PostgreSQL; the frontend is React 18 + Vite + TypeScript.

Everything runs on one machine — no cloud services are required.

The home feed displays one post at a time. Use the post arrow icons
or focus the post viewer and press the arrow keys to switch posts. More posts
load when you reach the end of the current batch. Multi-photo posts show one
image/video at a time with separate media arrows. Videos
retain their native playback controls; use the post arrows to move past a video.
Click the left or right quarter of an image to go previous/next (photos within
multi-photo posts, or posts for single-image posts). Click the middle half to zoom.
Drag/swipe navigation is disabled. Image filenames and sizes are not displayed
below images. Post cards use a consistent dark surface without colored zones.
The compact reaction bar uses outline reaction/comment icons with counts and
colored badges summarizing reactions on the right.
Frontend UI icons and loading indicators use `lucide-react`; branding letters
and user initials remain text.
Administrators can use a post's X icon to open a deletion warning. Confirm moves
the post to trash; the underlined permanent-delete link opens a separate
irreversible-delete confirmation. Cancel, Escape, the dialog X, or clicking outside
dismisses the dialog before submission. Actions are locked while deletion is in progress.
Manage Posts uses the same deletion dialog (already-trashed posts require permanent
deletion confirmation). Restoring a post, approving a user, and deleting a user
also require an explicit confirmation popup before the action is submitted.

## Technology Stack

| Layer      | Technology                                                           |
| ---------- | -------------------------------------------------------------------- |
| Backend    | ASP.NET Core 8.0 Web API, JWT (access + rotating refresh)            |
| Database   | PostgreSQL 16+ (local Windows install also works, e.g. PG 18)        |
| ORM        | EF Core 8 + Npgsql, snake_case naming conventions                    |
| Storage    | Local filesystem (`Backend/Storage/Media` + `Backend/Storage/Trash`) |
| Frontend   | React 18, Vite 6, TypeScript, TanStack Query, Zustand, React Router  |
| Validation | Backend builds only; Vitest for frontend tests                       |

## Architecture

```
Frontend (React, http://localhost:3000)
        │  REST + JWT
        ▼
Backend ASP.NET Core Web API (http://localhost:8000)
  ├─ Apis (controllers, middleware, HTTP identity adapter)
  ├─ Services (public use-case contracts, shared models, IMapper)
  ├─ Domains (entities, enums)
  └─ Infrastructures (single project)
      ├─ Data (workflows, EF Core DbContext, migrations, repositories)
      └─ Adapters (media storage)
        │                │
        ▼                ▼
 PostgreSQL          Local filesystem
 shinigacim_db       media/ + trash/
```

### Backend layout (`Backend/`)

- `Apis` — controllers, seeding, middleware, HTTP current-user implementation
- `Services` — public use-case interfaces, shared contracts, DTOs, requests, responses, mappings, and JWT options
- `Domains` — one entity or enum per file
- `Infrastructures` — one project (`Infrastructures.csproj`) containing the Data and Adapters source areas
- `Infrastructures/Data` — workflow services, persistence interfaces, `ApplicationDbContext`, migrations, and EF repositories
- `Infrastructures/Adapters` — `MediaStorageService`
- `Scripts/` — legacy helpers; not validated for the renamed project paths

Project and assembly names omit the `ShinigaCim` prefix. The restricted security source retains
its original namespace, and restricted scripts remain unchanged. Existing build outputs may remain
in old prefixed folders; those folders are no longer solution projects.

## Getting Started

### 1. PostgreSQL

Create a database `shinigacim_db` on a local PostgreSQL instance, e.g.:

```powershell
$env:PGPASSWORD = '<postgres password>'
&E:\DB\PostgreSQL\18\bin\psql.exe -U postgres -h localhost -c "CREATE DATABASE shinigacim_db;"
```

The connection string lives in [Backend/Apis/appsettings.json](Backend/Apis/appsettings.json)
(host/port/user/password) — change it to match your machine.

### 2. Backend

```powershell
cd Backend
dotnet run --project Apis
```

First start applies migrations automatically, creates `storage/Media` and `storage/Trash`,
and seeds the admin account (config: `Seed:AdminUsername`, `Seed:AdminPassword`;
defaults `admin` / `ChangeMeAdmin!1` — dev-only).

Passwords are stored as plaintext in `users.password` and compared exactly during login.
This is unsafe for production; use only disposable local-development credentials.
The initial migration targets a fresh database. Existing hashed passwords are not converted,
and existing accounts are not overwritten by seeding.

Swagger UI: http://localhost:8000/swagger

### 3. Frontend

```powershell
cd Frontend
npm install
npm run dev
```

Open http://localhost:3000. During development, Vite uses same-origin API and media
URLs and proxies `/api` and `/hubs` (including notification WebSockets) to
`http://localhost:8000`. Keep the backend running separately.

For ngrok, tunnel port 3000 and add your exact ngrok hostname to
`server.allowedHosts` in `Frontend/vite.config.ts`. Restart Vite after changing
the configuration. No separate backend tunnel or CORS change is needed.
Only share the tunnel with trusted users and use disposable development credentials.

Development overrides `VITE_API_URL` to use the proxy. Production builds still use
`VITE_API_URL`; set it to the deployed API base URL before `npm run build`.
The development proxy does not run in the built frontend.

### Validation

Do not write, modify, or run backend tests, API smoke tests, or verification scripts.
Use direct build commands rather than unverified helper scripts:

```powershell
cd Backend
dotnet build ShinigaCim.sln
dotnet build ShinigaCim.sln -c Release --no-restore
```

Frontend tests remain permitted:

```powershell
cd Frontend
npm test -- --run
```

## Features

- **Theme:** use the sun/moon button on sign-in, registration, or beside the
  language and notification controls in the app header to
  switch between light and dark mode. The choice persists across reloads.
  Animate UI reveals the new theme with a left-to-right page wipe; reduced-motion
  preferences and browsers without View Transitions use an instant switch.
- **Interface:** original Zenith AI-inspired styling with charcoal surfaces, pink/violet
  gradients, pill controls, a responsive sign-in screen, and a community feed layout.
  Existing authentication and media-sharing workflows are unchanged. Decorative artwork
  is CSS-only; no paid template code, assets, fonts, or external UI services are required.
- **Auth:** public registration, plaintext passwords (local development only),
  JWT access tokens (15 min) + rotating refresh tokens (7 days, stored as SHA-256
  hashes). Refresh-token reuse revokes the whole token family (theft detection).
- **Feed:** paged, newest-first; posts with captions + multiple media attachments.
- **Admin post layout:** choose 1-6 posts per row. The saved column count applies
  on entry and reload at every screen width; column widths reset evenly when the count changes.
- **Admin media preview:** open a post thumbnail or preview icon to browse its images
  and videos. Deleted-post media is previewed directly from trash without restoring it.
  The file endpoint's `includeDeleted=true` option requires an admin token.
- **Media:** images (jpg/jpeg/png/gif/webp) and videos (mp4/webm/mov/m4v/avi/mkv), up to
  100 MB each (configurable). Files live on disk; the DB stores metadata only. Serving
  supports HTTP range requests (video seeking) and authenticates via Authorization header
  **or** `?accessToken=` (browser `<img>`/`<video>` cannot send headers).
- **Post upload watcher:** share media using the existing feed composer, then follow
  progress under **Sync > Upload**. Each post submission creates one persistent batch
  with sequential per-file progress, retry, and cancellation controls; there is no separate
  upload composer. The first successful file creates the feed post with its caption.
  Later files and retries attach to that same post without re-uploading successful files.
  All-failed or all-cancelled submissions do not create empty posts. Users see only their
  own batches; admins see all batches and owner usernames. Pending bytes remain in the
  submitting browser's IndexedDB, so resuming or retrying requires the same browser
  profile and device. Closing the browser pauses processing; the server retains results.
  Deleting the post cancels its pending and uploading items before moving media to trash.
  The upload screen refreshes on `UploadsChanged` events from `/hubs/notifications`,
  not on a timer. Events cover batch creation, recovery, progress, status changes,
  and post deletion, and reach only the owner and administrators. Connecting or
  reconnecting refreshes the upload list to catch missed events. The browser's
  background upload worker also stays idle without polling `/api/uploads/queue`
  or `/api/uploads/active`. Notifications, connection recovery, local submissions,
  retries, and cancellations wake it. It drains pending files sequentially, then
  waits for another change; failed requests retain retry backoff.
- **Comments:** add/edit/delete, author-or-admin authorization, oldest-first paging.
- **Reactions:** multiple types (`like`, `heart`, `laugh`), idempotent add/remove; removing
  is a soft delete; unique per (post, user, type) among active rows via a partial index.
- **Audit columns on every entity:** `created_by/created_at`, `updated_by/updated_at`,
  `deleted_by/deleted_at`, stamped centrally in `SaveChangesAsync` from the authenticated
  principal (never client input).
- **Soft delete everywhere:** `Remove()` throws — physical DB deletes are impossible
  through the API or context. Deleted rows are hidden by global query filters while
  remaining in the table.
- **Media trash workflow:** deleting a post/Media moves the file(s) into
  `storage/Trash/<kind>/` and records `trash_relative_path`/`trashed_at` while keeping the
  original `relative_path` for restoration (`POST /api/media/{id}/restore`). Filesystem
  and DB steps are kept consistent with verify-copy + compensation-rollback logic.
- **Foreign keys never cascade** (`DeleteBehavior.NoAction` everywhere).

## REST API overview (all under `/api`, Bearer JWT except where noted)

| Endpoint                                         | Method(s)      | Notes                                                          |
| ------------------------------------------------ | -------------- | -------------------------------------------------------------- |
| `/auth/register`, `/auth/login`, `/auth/refresh` | POST           | anonymous (`register` creates a `PendingApproval` account)     |
| `/auth/logout`, `/auth/me`                       | POST, GET      | authorized                                                     |
| `/users?`                                        | GET            | admin — all accounts, pending first                            |
| `/users/{id}/approve`                            | POST           | admin — activates a pending account                            |
| `/users/{id}`                                    | DELETE         | admin — soft delete + session revoke                           |
| `/posts?offset=&limit=`                          | GET            | feed                                                           |
| `/posts`                                         | POST           | multipart: caption + files[]                                   |
| `/posts/{id}`                                    | GET/PUT/DELETE | PUT = caption; DELETE = soft delete + trash                    |
| `/posts/uploads`                                 | POST           | caption + file metadata; queue one tracked feed post submission |
| `/uploads/batches`                               | GET            | authorized — list the current user's post upload batches   |
| `/uploads/batches/{id}`                          | GET            | authorized — owner only (admins may view any batch)            |
| `/uploads/admin/batches`                         | GET            | admin — all batches, including owner usernames                 |
| `/uploads/batches/{id}/items/{itemId}/...`       | POST           | authorized — start, report progress, upload, cancel, or fail   |
| `/posts/{id}/comments`                           | GET/POST       |                                                                |
| `/comments/{id}`                                 | PUT/DELETE     | soft delete, idempotent                                        |
| `/posts/{id}/reactions`                          | POST           | body: `{ reactionType }`                                       |
| `/posts/{id}/reactions/{type}`                   | DELETE         | idempotent                                                     |
| `/Media/{id}/file`                               | GET            | anonymous w/ header or `?accessToken=`                         |
| `/Media/{id}` / `/Media/{id}/restore`            | DELETE/POST    | per-file trash/restore                                         |

Errors are RFC 7807 problem details (`application/problem+json`).

## Configuration highlights ([Backend/Apis/appsettings.json](Backend/Apis/appsettings.json))

- `ConnectionStrings:Default` — PostgreSQL DSN
- `Jwt:Key` — dev key; replace with user-secrets/env for anything beyond local dev
- `MediaStorage:Root` — storage tree root (empty → `<Backend>/Storage`)
- `MediaStorage:MaxFileMegabytes` — per-file upload limit (default 100 MB); each post can contain up to 20 GB total media
- `Cors:AllowedOrigins` — `http://localhost:3000` by default
- `Seed:*` — admin account seeding + auto-migrate toggle

See the [project overview](.opencode/instructions/overview.md) for AI guidance, [architecture](.opencode/instructions/architecture.md) for target layout conventions, and [code map](.opencode/instructions/code-map.md) for current implementation paths.

Know-what-to-run next: see `MIGRATION.md` for the local-to-production checklist.
