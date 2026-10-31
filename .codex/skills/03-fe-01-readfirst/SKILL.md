---
name: 03-fe-01-readfirst
description: "Load for ShinigaCim frontend work: React, TypeScript, Vite, UI architecture, API client and auth flows, conventions, and frontend validation."
user-invocable: false
---

# Frontend Overview

Load this skill for work in `Frontend/`. For full-stack work, also load [02-be-01-readfirst](../02-be-01-readfirst/SKILL.md). Read only the relevant child skill and project detail after this overview.

## Stack and architecture

ShinigaCim uses React, TypeScript, Vite, TanStack Query, and Zustand. The app is organized by routed pages and reusable feature components, with hooks and services handling behavior and API access.

```text
Routes → Pages → Features → Shared Components / Services → API
                     ↘ Hooks / Store / Context
```

Use a feature-oriented structure: keep feature-specific components, hooks, API operations, state, and types together in `src/features/<feature>/`. Keep genuinely reusable primitives and cross-feature concerns in shared top-level areas.

```text
src/
  assets/          # Static images, fonts, and icons
  components/
    common/        # Reusable UI primitives
    layout/        # Shared application shell and navigation
  features/
    <feature>/
      components/
      hooks/
      services/
      types/
      index.ts     # Optional public feature exports
  pages/           # Route-level screens composed from features
  routes/          # Route definitions and route guards
  hooks/           # Cross-feature hooks only
  context/         # Shared React providers, when needed
  store/           # Cross-feature client state
  services/        # Shared API client and external integrations
  config/          # App-level configuration
  types/           # Cross-feature types
  utils/           # Cross-feature helpers
  styles/          # Global styles and theme
```

This is a guide, not a requirement to create every directory. Prefer colocating a component's styles and tests with the component or feature. Keep route-level pages focused on composition; business behavior belongs in features. Keep shared `services/`, `hooks/`, `types/`, and `utils/` limited to functionality used across features.

## Frontend conventions

- Use PascalCase for React components and TypeScript types; use camelCase for functions, variables, and object properties.
- Prefix custom hooks with `use`.
- Prefer named exports for components and hooks.
- Components must not call `fetch` directly; use services.
- Use TanStack Query for remote/server state and Zustand for shared client state.
- Use local animated icon components from `src/components/animate-ui/icons`.
- Use `var(--surface-hover)` as the project-default neutral hover/focus-highlight background for navigation, tabs, and ghost controls, matching sidebar items. It is `#DEDEDE` at 14% opacity in dark mode and `#1C1C1C` at 12% in light mode, defined in `src/styles/global.css`. Keep selected, destructive, and other semantic states distinct.
- Row-level actions are icon buttons with descriptive `aria-label` and `title`; show a spinner while busy. Hide decorative icons from assistive technology.
- Do not define a component inside another component's body.
- Keep comments limited to necessary facts or non-obvious constraints.

## ShinigaCim-specific flows and constraints

- `src/App.tsx` wires theme, locale, query, animation, and toast providers with routes for galleries, albums, uploads, users, sign-in, and registration.
- Feature code currently lives in `src/features/auth/`, `albums/`, `media/`, `uploads/`, `users/`, and `notifications/`; keep route pages focused on composition.
- Albums use `/albums` routes and the `/api/collections` API. Galleries show standalone pictures, videos, favorites, and admin trash; uploads track standalone media batches.
- Request flow: page/component → feature hook or service → `src/services/api.ts` → backend REST API.
- The API client injects bearer tokens, parses problem details, coordinates a single refresh for concurrent 401s, replaces session tokens, and retries the original request once. Failed authentication clears the session.
- Browser `<img>` and `<video>` elements cannot attach an Authorization header; protected media therefore uses the authenticated query-token URL form.
- Admin trash requires a valid JWT with `role: admin`. Deleted-media previews use `includeDeleted=true`; the backend serves trashed files without restoring them.
- On phones, `AuthenticatedLayout` uses an off-canvas sidebar. Keep keyboard focus inside the open drawer, make page content inert, return focus on close, and retain the localized skip link.
- Validate frontend work with the existing build. Run tests only under the conditions in the Validation section.

## PWA support and limits

- Production builds register `/service-worker.js`; the manifest provides standalone display and app icons. HTTPS is required in deployment; localhost is accepted for development.
- The service worker precaches the app shell and built frontend assets so the application can start offline after installation. Feed data, authentication, uploads, notifications, and protected media remain online-only.
- Never cache authenticated API responses, tokens, or protected media in the service worker. Offline data access needs an explicit privacy and persistence design.
- Standalone Windows installation works through a supported browser such as Edge or Chrome; this is not a native Windows package.
- Background Sync and queued offline writes are not implemented. Before adding them, define supported operations, retry and conflict behavior, idempotency, and handling of expired authentication.
- Native push is not implemented. It needs a push subscription lifecycle, backend storage and delivery, VAPID configuration, permission UX, and HTTPS.

## Validation

Do not run frontend tests unless the user explicitly requests them or you are more
than 70% confident that the task is large in scope. For smaller tasks, use the
existing build and focused code review instead. Do not run Playwright or browser-driven
tests unless the user explicitly requests them.

From `Frontend/`, use the existing commands:

```powershell
npm run build
npm test -- --run
npm test -- --run src/store/authStore.test.ts
```

When tests are warranted under this rule, prefer focused test files over the full suite. Other available scripts and the complete current file map are in [frontend-project-info.md](../../../Frontend/frontend-project-info.md).

## Child skills

Load only the skill matching the frontend task:

| Task                                   | Skill                          |
| -------------------------------------- | ------------------------------ |
| Component and UI implementation        | `03-fe-03-ui-engineering`      |
| Visual design and UX                   | `03-fe-04-ui-ux`               |
| Design direction and UI quality passes | `03-fe-05-impeccable`          |
| Cross-cutting performance              | `01-overview-03-performance`   |
| Serialization and data contracts       | `01-overview-04-serialization` |

## Further details

- [Frontend project info](../../../Frontend/frontend-project-info.md): current file locations, auth handling, admin features, and media URLs.
- [Conventions](../../../Instructions/conventions.md): shared naming and comment guidance.
- [Architecture](../../../Instructions/architecture.md): shared ownership and target-layout notes.
