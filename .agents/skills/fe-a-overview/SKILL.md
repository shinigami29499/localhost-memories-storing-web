---
name: fe-a-overview
description: "Load for ShinigaCim frontend work: React, TypeScript, Vite, UI architecture, API client and auth flows, conventions, and frontend validation."
user-invocable: false
---

# Frontend Overview

Load this skill for work in `Frontend/`. For full-stack work, also load [be-a-overview](../be-a-overview/SKILL.md). Read only the relevant child skill and project detail after this overview.

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
- Use named imports from `lucide-react`; do not add another icon library.
- Row-level actions are icon buttons with descriptive `aria-label` and `title`; show a spinner while busy. Hide decorative icons from assistive technology.
- Do not define a component inside another component's body.
- Keep comments limited to necessary facts or non-obvious constraints.

## ShinigaCim-specific flows and constraints

- `src/App.tsx` wires the query provider, routes, protected home, authentication pages, and admin pages.
- Request flow: page/component → query hook or resource service → `src/services/api.ts` → backend REST API.
- The API client injects bearer tokens, parses problem details, coordinates a single refresh for concurrent 401s, replaces session tokens, and retries the original request once. Failed authentication clears the session.
- Browser `<img>` and `<video>` elements cannot attach an Authorization header; protected media therefore uses the authenticated query-token URL form.
- Admin pages require a valid JWT with `role: admin`. Deleted-media previews use the existing endpoint with `includeDeleted=true`; the backend validates the admin role and serves trashed files without restoring them.
- Frontend work is validated with the existing frontend build and, where relevant, Vitest tests. Frontend tests are permitted.

## Validation

From `Frontend/`, use the existing commands:

```powershell
npm run build
npm test -- --run
npm test -- --run src/store/authStore.test.ts
```

Prefer a focused test file for a targeted change. Other available scripts and the complete current file map are in [frontend-project-info.md](../../../Frontend/frontend-project-info.md).

## Child skills

Load only the skill matching the frontend task:

| Task                             | Skill                                  |
| -------------------------------- | -------------------------------------- |
| Component and UI implementation  | `fe-b-frontend-ui-engineering`         |
| Visual design and UX             | `fe-b-ui-ux-pro-max`                   |
| Cross-cutting performance        | `a-overiew-b-performance-optimization` |
| Serialization and data contracts | `a-overiew-b-serialization`            |

## Further details

- [Frontend project info](../../../Frontend/frontend-project-info.md): current file locations, auth handling, admin features, and media URLs.
- [Conventions](../../../Instructions/conventions.md): shared naming and comment guidance.
- [Architecture](../../../Instructions/architecture.md): shared ownership and target-layout notes.
