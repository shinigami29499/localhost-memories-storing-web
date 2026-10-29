# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository-specific guidance

- Read [AGENTS.md](AGENTS.md) and load the matching backend/frontend overview skill before making changes. Consult [Instructions/overview.md](Instructions/overview.md) and its shared guides when needed; stack-specific policy lives in the overview skills.
- The application is intentionally local-first: PostgreSQL and media files are local dependencies, and startup can mutate the database and storage directories.
- Do not read or edit the restricted `Backend/Adapter/Security` source or helper scripts under `Backend/Scripts`.
- Do not add backend tests or run backend test/API verification commands. Backend changes are validated with compilation/build checks and focused review. Frontend tests are allowed.

## Common commands

Run commands from the repository root unless a `cd` is shown.

### Backend

```powershell
# Build the full solution
 dotnet build Backend\ShinigaCim.sln

# Release build without restoring packages
 dotnet build Backend\ShinigaCim.sln -c Release --no-restore

# Run the API (startup applies configured migrations/seeding and creates storage directories)
 dotnet run --project Backend\Apis
```

The API listens on `http://localhost:8000`; Swagger is at `/swagger`. Configure the local PostgreSQL connection and seed settings in `Backend/Apis/appsettings.json` or through normal ASP.NET configuration overrides before running it.

Do not run `dotnet test`, backend test runners, API smoke tests, or verification scripts. Do not use `dotnet run` as a read-only validation step because API startup may change the database and filesystem.

### Frontend

```powershell
cd Frontend
npm install
npm run dev
npm run build
npm test -- --run
npm test -- --run src/store/authStore.test.ts
npm test -- --run src/pages/gallery/TrashPage.test.tsx
npm run preview
```

The Vite development server runs at `http://localhost:3000`. `Frontend/.env` normally sets `VITE_API_URL=http://localhost:8000`. Vitest discovers `src/**/*.test.{ts,tsx}` and uses the Node environment; pass a file path or Vitest filter after `--run` to run a subset.

## Architecture

ShinigaCim is a React/Vite client over an ASP.NET Core 8 REST API. The API uses EF Core 8/Npgsql for PostgreSQL persistence, JWT access tokens plus rotating refresh tokens for authentication, and local filesystem storage for media binaries. The database stores media metadata and relative paths; files are kept under the configured media storage root and its trash area.

```text
Frontend (React + Vite, :3000)
  pages/components -> hooks/services/store -> API client -> REST + JWT
                                      |
                                      v
Backend (ASP.NET Core, :8000)
  Apis -> Services -> Domains
    |
    └── Infrastructures -> Services, Domains
          ├── Data -> PostgreSQL
          └── Adapters -> filesystem
```

### Backend boundaries

- `Backend/Apis` owns HTTP concerns: `Program.cs` composition and configuration, controllers, middleware, authorization attributes, startup seeding, and the HTTP-backed current-user/audit adapter.
- `Backend/Services` owns public use-case interfaces, shared application contracts, requests, responses, DTO models, mappings, exceptions, token handling, and options. It depends on `Domains`, not on infrastructure projects or `Apis`.
- `Backend/Domains` owns entities, base classes, and enums. Keep domain types independent of application and infrastructure layers.
- `Backend/Infrastructures/Data` owns its repository, unit-of-work, transaction, and audit interfaces; their implementations; and workflow services that use them. It also owns `ApplicationDbContext`, EF configuration, migrations, async persistence, global soft-delete filters, and centralized audit stamping.
- `Backend/Infrastructures/Adapters` owns external integrations, especially filesystem media storage, and implements application-owned interfaces.

The normal request path is controller -> public use-case interface -> workflow service in `Infrastructures/Data/ApplicationServices` -> Data-owned repository/unit-of-work interfaces -> Data implementations -> mapped response. Controllers should remain thin. Use the existing `IMapper` abstraction and mapping definitions in `Services/Mappings` rather than duplicating entity/DTO mapping in controllers or workflows. `Apis` composes the projects; `Services` references `Domains`; the single `Infrastructures` project references `Services` and `Domains` and contains Data and Adapters as source areas.

Persistence and media operations have important cross-cutting invariants:

- Entities are soft-deleted; `Remove()` is not a physical-delete mechanism. Global query filters hide deleted rows, and foreign keys use `DeleteBehavior.NoAction`.
- `ApplicationDbContext` stamps audit fields from the authenticated actor and rejects synchronous `SaveChanges`; preserve async persistence.
- Media deletion and restoration coordinate database state with filesystem moves and compensation/rollback. Keep both sides consistent when changing these workflows.
- Admin routes use the `AdminOnly` policy through `[RequireAdmin]`.
- Registration creates pending users; approval activates them. Refresh-token rotation and reuse detection are part of the authentication flow.

### Frontend boundaries

- `Frontend/src/App.tsx` wires the query provider, routes, protected home, authentication pages, and admin pages.
- `Frontend/src/services` contains the API client and feature resource calls. `api.ts` owns bearer-token injection, problem-details parsing, single-flight token refresh, and one retry after a 401.
- `Frontend/src/store` contains shared Zustand state, including the persisted authentication session.
- `Frontend/src/hooks` contains reusable query and behavior hooks. Album and media query hooks own resource paging.
- `Frontend/src/pages` owns routed screens; `components` contains reusable layout and UI components.
- `Frontend/src/types`, `utils`, and `styles` contain shared TypeScript contracts, helpers, and theme/global styling.

For a feature, trace it from the routed page/component through its hook or service, then through `Frontend/src/services/api.ts` to the matching backend controller and service. Media URLs may use the authenticated query-token form because browser image/video elements cannot attach an Authorization header.

## Configuration and data flow

- PostgreSQL database: `shinigacim_db` by default; the connection string is in `Backend/Apis/appsettings.json` and should be overridden for machine-specific credentials.
- Backend storage: `MediaStorage:Root` defaults to the backend storage tree; active files and trash files must remain available for restoration workflows.
- Frontend API base URL: `VITE_API_URL`.
- CORS origins and seed/migration behavior are configured in the backend app settings.
- The initial migration targets a fresh database. Existing local accounts are not overwritten by seeding.

For deployment or hosted-instance work, consult [MIGRATION.md](MIGRATION.md), which covers database, durable media storage, secrets/JWT, HTTPS, CORS, and frontend API configuration.
