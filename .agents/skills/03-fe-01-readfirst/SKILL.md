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
- When reusing or referring to an existing component, compare the original and final implementations. If they are equivalent, use one shared component and remove the unused duplicate after updating its references.
- For new features, reuse shared UI components from `src/components/ui`. If a reusable primitive does not exist, add it there and export it from the UI barrel before using it in feature components. Keep feature-specific components inside their feature.
- Components must not call `fetch` directly; use services.
- Use TanStack Query for remote/server state and Zustand for shared client state.
- Use familiar, labeled icons. Keep navigation and common controls static; use motion only where it clarifies state.
- Toasts use semantic palettes in `src/components/ui/toast.css`: red for error and delete, amber for warning, green for success, and blue for information. Pair a pale background and border with darker readable text and a solid accent icon.
- Use `var(--surface-hover)` for neutral hover and focus highlights. The app has one light theme and five authored UI colors in `src/styles/global.css`; keep selected and destructive states distinct through text, icons, and boundaries.
- Row-level actions are icon buttons with descriptive `aria-label` and `title`; show a spinner while busy. Hide decorative icons from assistive technology.
- For Delete inside an existing dialog, confirm inline: replace its action row with narrow Cancel and a solid destructive action, and show the target and consequence below. Focus Cancel and disable both actions while deleting; do not open another dialog.
- Do not define a component inside another component's body.
- Keep comments limited to necessary facts or non-obvious constraints.

## ShinigaCim-specific flows and constraints

- `src/App.tsx` wires theme, locale, query, animation, and toast providers with routes for galleries, albums, uploads, users, sign-in, and registration.
- Feature code currently lives in `src/features/auth/`, `albums/`, `media/`, `uploads/`, `users/`, and `notifications/`; keep route pages focused on composition.
- Albums use `/gallery/album` routes and the `/api/library/album` API. Galleries show shared media, favorites, and admin trash; uploads track standalone media batches.
- Request flow: page/component → feature hook or service → `src/services/api.ts` → backend REST API.
- The API client injects bearer tokens, parses problem details, coordinates a single refresh for concurrent 401s, replaces session tokens, and retries the original request once. Failed authentication clears the session.
- Browser `<img>` and `<video>` elements cannot attach an Authorization header; protected media therefore uses the authenticated query-token URL form.
- Admin trash requires a valid JWT with `role: admin`. Deleted-media previews use `includeDeleted=true`; the backend serves trashed files without restoring them.
- On phones, `AuthenticatedLayout` uses bottom navigation with a native More dialog; desktop uses a left sidebar. Preserve dialog focus return and the localized skip link.
- For mobile page-action bars, follow [Mobile action-bar behavior](#mobile-action-bar-behavior).
- Validate frontend work with the existing build. Run tests only under the conditions in the Validation section.

## Mobile action-bar behavior

At widths up to 767px, reuse `PageActionBar` and its existing mobile transitions. Keep desktop behavior unchanged.

- Gallery, Albums, Trash, album detail, and map navigation use a compact vertical icon bar, 12px from the main area's right and bottom edges. Put the primary/add action at the bottom. Use accessible labels and titles, and preserve the surface-colored outer border throughout motion.
- When a vertical bar gains actions, expand upward from its bottom; when it loses actions, collapse downward. When the whole bar leaves, slide it right; when it enters, slide it left. Keep its border intact during expansion and collapse.
- Saved, History, and Users use a horizontal search bar. Slide it upward from fully behind the bottom navigation on entry and downward behind it on exit. Keep its width stable; do not expose a sliver above the navigation before entry.
- Between Saved, History, and Users, keep the same horizontal search bar visually continuous; do not animate its replacement or leave a blank frame. Saved-to-History and History-to-Saved also keep the bar in place.
- Change the page immediately. When different bar types replace each other, let the outgoing bar finish before the incoming bar starts; preserve the existing 200ms motion and 50ms handoff. Remove exit copies after use, prevent stale copies during rapid navigation, and keep the bottom navigation above sliding bars.
- Respect the animation setting and reduced-motion preference. Preserve keyboard access and accessible names when actions are icon-only.

Implementation lives in `src/components/layout/PageActionBar.tsx`, `src/pages/gallery/gallery.css`, and the relevant page styles. When browser-driven tests are necessary, use `e2e/mobile-gallery-actions.spec.ts`, `e2e/mobile-location-action-bar.spec.ts`, and `e2e/mobile-users-action-transition.spec.ts`; verify rendered positions, visible motion, handoff timing, border continuity, and absence of ghost bars, not just animation keyframes.

## PWA support and limits

- Production builds register `/service-worker.js`; the manifest provides standalone display and app icons. HTTPS is required in deployment; localhost is accepted for development.
- The service worker precaches the app shell and built frontend assets so the application can start offline after installation. Feed data, authentication, uploads, notifications, and protected media remain online-only.
- Never cache authenticated API responses, tokens, or protected media in the service worker. Offline data access needs an explicit privacy and persistence design.
- Standalone Windows installation works through a supported browser such as Edge or Chrome; this is not a native Windows package.
- Background Sync and queued offline writes are not implemented. Before adding them, define supported operations, retry and conflict behavior, idempotency, and handling of expired authentication.
- Native push is not implemented. It needs a push subscription lifecycle, backend storage and delivery, VAPID configuration, permission UX, and HTTPS.

## Validation

Except for Playwright or browser-driven tests, do not run frontend tests unless the user explicitly requests them or you are more
than 70% confident that the task is large in scope. For smaller tasks, use the
existing build and focused code review instead. Run Playwright or browser-driven
tests when necessary.

From `Frontend/`, use the existing commands:

```powershell
npm run build
npm test -- --run
npm test -- --run src/store/authStore.test.ts
```

When tests are warranted under this rule, prefer focused test files over the full suite. Other available scripts and the complete current file map are in [frontend-project-info.md](../../../Frontend/frontend-project-info.md).

## Child skills

Load the skill matching the frontend task. For UI color decisions, also load `03-fe-07-ui-color-system` as the primary color guidance. For UI depth decisions, also load `03-fe-08-ui-depth-system` as the primary depth guidance. Apply each alongside other relevant skills:

| Task                                   | Skill                          |
| -------------------------------------- | ------------------------------ |
| UI color palettes and theming          | `03-fe-07-ui-color-system`     |
| UI depth, elevation, and surface layers | `03-fe-08-ui-depth-system`    |
| Component and UI implementation        | `03-fe-03-ui-engineering`      |
| Visual design and UX                   | `03-fe-04-ui-ux`               |
| Design direction and UI quality passes | `03-fe-05-impeccable`          |
| Cross-cutting performance              | `01-overview-03-performance`   |
| Serialization and data contracts       | `01-overview-04-serialization` |

## Further details

- [Frontend UI standard](../../../Instructions/frontend-ui-standard.md): required design and review rules for new user-facing features.
- [Frontend project info](../../../Frontend/frontend-project-info.md): current file locations, auth handling, admin features, and media URLs.
- [Conventions](../../../Instructions/conventions.md): shared naming and comment guidance.
- [Architecture](../../../Instructions/architecture.md): shared ownership and target-layout notes.
