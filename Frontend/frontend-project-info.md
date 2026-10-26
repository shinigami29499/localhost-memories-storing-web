# Frontend Project Reference

Use the [`fe-a-overview` skill](../.agents/skills/fe-a-overview/SKILL.md) for frontend architecture, conventions, and validation guidance. This page is a current-location and implementation reference.

## Current file locations

| Component             | Current path                  |
| --------------------- | ----------------------------- |
| React entry           | `src/main.tsx`                 |
| App shell and routing | `src/App.tsx`                  |
| Shared API client     | `src/services/api.ts`          |
| Auth feature          | `src/features/auth/`           |
| Posts/feed feature    | `src/features/posts/`          |
| User-management API   | `src/features/users/`          |
| Auth store (Zustand)  | `src/store/authStore.ts`       |
| Pages                 | `src/pages/`                   |
| UI components         | `src/components/ui/`           |
| Layout components     | `src/components/layout/`       |
| Shared styles         | `src/styles/global.css`        |
| Vite config           | `vite.config.ts`               |
| Package manifest      | `package.json`                 |

## Runtime and development

From `Frontend/`:

```powershell
npm install
npm run dev
npm run build
npm run preview
```

The Vite development server runs at `http://localhost:3000`. `Frontend/.env` normally sets `VITE_API_URL=http://localhost:8000`.

Vitest discovers `src/**/*.test.{ts,tsx}` and uses the Node environment. For supported test commands and validation policy, refer to the frontend overview skill.

## API client details

Request flow:

```text
Page or component
    → feature query hook or resource service (src/features/*)
    → API client (src/services/api.ts)
    → Backend REST API
```

The API client handles bearer-token injection, problem-details parsing, single-flight token refresh after a 401, and one retry of the original request. Successful refresh replaces the stored session tokens; failed authentication clears the session.

Feature-specific components, hooks, services, and types live in `src/features/<feature>/`. Route-level screens remain in `src/pages/`, while the API client, Zustand auth store, shared UI, and cross-feature helpers remain in their shared top-level folders.

Protected media uses the authenticated query-token URL form because browser `<img>` and `<video>` elements cannot attach an Authorization header.

## Admin and theme details

- Admin pages require the backend admin policy and a JWT with `role: admin`.
- Post management has no enclosing panel or visible page heading. Cards flow left to right and wrap with available width, using a 272px baseline (the former three-column card size) and shrinking on narrow screens. Column counts are automatic; saved manual column settings are no longer used. Pagination uses server-side offsets and saves the page size (10, 20, 50, or 100) locally. Shared pagination controls use Animate UI's pagination primitive for the sliding active-page indicator and its reduced-motion crossfade.
- Deleted-media previews use the existing media endpoint with `includeDeleted=true`; the backend validates admin access before bypassing soft-delete filters.
- Deleted media streams from stored trash paths without restoration, and caching is disabled for deleted-media requests.
- Global styles and theme tokens are in `src/styles/global.css`; follow the existing Zeneth AI-inspired theme tokens when adding styles.
- Sidebar styles live in `src/styles/sidebar.css`. `AuthenticatedLayout` owns the shared Animate UI sidebar provider; the sidebar spacer is a sibling of the fixed panel so content and footer stay aligned with its collapse timing. Narrow screens start with a compact rail that can expand over the content.
- Icon-bearing controls use `AnimateIcon animateOnHover asChild` around the whole button, link, or label. Child icons inherit the control's animation context; do not attach a separate hover trigger to the SVG. Loading spinners retain their continuous loading behavior.
- The feed has one heart reaction button with Animate UI press and particle effects. Clicking toggles the heart and clears any previous personal reactions before adding it. This single-selection behavior is enforced by the frontend using the existing API, not an atomic backend constraint. Each successful mutation updates the feed even if a later request fails.

For shared guidance, see [architecture.md](../Instructions/architecture.md) and [conventions.md](../Instructions/conventions.md).
