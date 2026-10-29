# ShinigaCim — Local Media-Sharing Site

A locally hosted media library: registered users upload images and videos, organize them
into private or public albums, and browse albums they can view from Home. The backend is
an ASP.NET Core 8 Web API backed by PostgreSQL; the frontend is React 18 + Vite + TypeScript.

Everything runs on one machine — no cloud services are required.

Home lists owned and public albums using their preview images. Opening an album loads
its paged media; Pictures, Videos, and Favorites browse the user's media library.
Uploads are managed separately and create standalone media records. Administrators can
restore deleted media from Trash.

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
  gradients, pill controls, a responsive sign-in screen, and an album-library layout.
  Existing authentication and media-sharing workflows are unchanged. Decorative artwork
  is CSS-only; no paid template code, assets, fonts, or external UI services are required.
- **Auth:** public registration, plaintext passwords (local development only),
  JWT access tokens (15 min) + rotating refresh tokens (7 days, stored as SHA-256
  hashes). Refresh-token reuse revokes the whole token family (theft detection).
- **Home:** owned and public albums appear as preview cards; album media loads after opening an album.
- **Albums:** private or public albums organize media and support custom preview images.
- **Gallery:** Pictures, Videos, and Favorites browse standalone media records.
- **Media:** images (jpg/jpeg/png/gif/webp) and videos (mp4/webm/mov/m4v/avi/mkv), up to
  100 MB each (configurable). Files live on disk; the DB stores metadata only. Serving
  supports HTTP range requests (video seeking) and authenticates via Authorization header
  **or** `?accessToken=` (browser `<img>`/`<video>` cannot send headers).
- **Uploads:** standalone image/video batches support per-file progress, retry, and cancellation.
  Users see their own batches; admins can view all batches and owner usernames. Pending
  bytes remain in the browser's IndexedDB for retry and refresh recovery.
  The upload screen refreshes on `UploadsChanged` events from `/hubs/notifications`,
  not on a timer. Events cover batch creation, recovery, and progress, and reach only
  the owner and administrators. Connecting or
  reconnecting refreshes the upload list to catch missed events. The browser's
  background upload worker also stays idle without polling `/api/uploads/queue`
  or `/api/uploads/active`. Notifications, connection recovery, local submissions,
  retries, and cancellations wake it. It drains pending files sequentially, then
  waits for another change; failed requests retain retry backoff.
- **Audit columns on every entity:** `created_by/created_at`, `updated_by/updated_at`,
  `deleted_by/deleted_at`, stamped centrally in `SaveChangesAsync` from the authenticated
  principal (never client input).
- **Soft delete everywhere:** `Remove()` throws — physical DB deletes are impossible
  through the API or context. Deleted rows are hidden by global query filters while
  remaining in the table.
- **Media trash workflow:** deleting media moves the file into
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
| `/media?offset=&limit=`                          | GET            | current user's media, optionally filtered by kind              |
| `/media/favorites`                               | GET            | current user's favorited media                                 |
| `/media/deleted`                                 | GET            | admin — deleted media                                          |
| `/media/{id}/favorite`                           | POST/DELETE    | add/remove a media favorite                                    |
| `/media/{id}/file`                               | GET            | authorized with header or `?accessToken=`                      |
| `/media/{id}` / `/media/{id}/restore`            | DELETE/POST    | admin — media trash/restore                                    |
| `/collections?scope=`                            | GET            | current user's or public albums                                |
| `/collections`                                   | POST           | create an album                                                |
| `/collections/{id}`                              | GET/PUT/DELETE | read, update, or delete an album                               |
| `/collections/{id}/media`                        | GET/POST       | list or add album media                                        |
| `/collections/{id}/media/{mediaId}`              | DELETE         | remove media from an album                                     |
| `/uploads/batches`                               | GET/POST       | list batches or submit standalone media metadata               |
| `/uploads/batches/{id}`                          | GET            | authorized — owner only (admins may view any batch)            |
| `/uploads/admin/batches`                         | GET            | admin — all batches, including owner usernames                 |
| `/uploads/batches/{id}/items/{itemId}/...`       | POST           | authorized — start, report progress, upload, cancel, or fail   |

Errors are RFC 7807 problem details (`application/problem+json`).

## Configuration highlights ([Backend/Apis/appsettings.json](Backend/Apis/appsettings.json))

- `ConnectionStrings:Default` — PostgreSQL DSN
- `Jwt:Key` — dev key; replace with user-secrets/env for anything beyond local dev
- `MediaStorage:Root` — storage tree root (empty → `<Backend>/Storage`)
- `MediaStorage:MaxFileMegabytes` — per-file upload limit (default 100 MB)
- `Cors:AllowedOrigins` — `http://localhost:3000` by default
- `Seed:*` — admin account seeding + auto-migrate toggle

See the [project overview](.opencode/instructions/overview.md) for AI guidance, [architecture](.opencode/instructions/architecture.md) for target layout conventions, and [code map](.opencode/instructions/code-map.md) for current implementation paths.

Know-what-to-run next: see `MIGRATION.md` for the local-to-production checklist.
