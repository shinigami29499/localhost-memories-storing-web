# Frontend Project Reference

Use the [`fe-a-overview` skill](../.agents/skills/fe-a-overview/SKILL.md) for frontend architecture, conventions, and validation guidance. This page is a current-location and implementation reference.

## Current file locations

| Component             | Current path                  |
| --------------------- | ----------------------------- |
| React entry           | `src/main.tsx`                |
| App shell and routing | `src/App.tsx`                 |
| API client            | `src/services/api.ts`         |
| Auth service          | `src/services/authService.ts` |
| Post service          | `src/services/postService.ts` |
| User service          | `src/services/userService.ts` |
| Auth store (Zustand)  | `src/store/authStore.ts`      |
| Feed hook             | `src/hooks/useFeed.ts`        |
| Pages                 | `src/pages/`                  |
| UI components         | `src/components/ui/`          |
| Layout components     | `src/components/layout/`      |
| Feed components       | `src/components/feed/`        |
| Shared styles         | `src/styles/global.css`       |
| Vite config           | `vite.config.ts`              |
| Package manifest      | `package.json`                |

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
    → query hook or resource service (src/services/*)
    → API client (src/services/api.ts)
    → Backend REST API
```

The API client handles bearer-token injection, problem-details parsing, single-flight token refresh after a 401, and one retry of the original request. Successful refresh replaces the stored session tokens; failed authentication clears the session.

Protected media uses the authenticated query-token URL form because browser `<img>` and `<video>` elements cannot attach an Authorization header.

## Admin and theme details

- Admin pages require the backend admin policy and a JWT with `role: admin`.
- Deleted-media previews use the existing media endpoint with `includeDeleted=true`; the backend validates admin access before bypassing soft-delete filters.
- Deleted media streams from stored trash paths without restoration, and caching is disabled for deleted-media requests.
- Global styles and theme tokens are in `src/styles/global.css`; follow the existing Zeneth AI-inspired theme tokens when adding styles.

For shared guidance, see [architecture.md](../Instructions/architecture.md) and [conventions.md](../Instructions/conventions.md).
