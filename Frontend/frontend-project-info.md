# Frontend Project Reference

Use the [`fe-a-overview` skill](../.agents/skills/fe-a-overview/SKILL.md) for frontend architecture, conventions, and validation guidance. This page is a current-location and implementation reference.

## Current file locations

| Component             | Current path                  |
| --------------------- | ----------------------------- |
| React entry           | `src/main.tsx`                |
| App shell and routing | `src/App.tsx`                 |
| Shared API client     | `src/services/api.ts`         |
| Auth feature          | `src/features/auth/`          |
| Posts/feed feature    | `src/features/posts/`         |
| User-management API   | `src/features/users/`         |
| Notifications feature | `src/features/notifications/` |
| Auth store (Zustand)  | `src/store/authStore.ts`      |
| Pages                 | `src/pages/`                  |
| UI components         | `src/components/ui/`          |
| Layout components     | `src/components/layout/`      |
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
    → feature query hook or resource service (src/features/*)
    → API client (src/services/api.ts)
    → Backend REST API
```

The API client handles bearer-token injection, problem-details parsing, single-flight token refresh after a 401, and one retry of the original request. Successful refresh replaces the stored session tokens; failed authentication clears the session.

The top-right notification bell sits beside the language toggle in the shared sticky authenticated header. The header reserves its own row above every routed page, including loading, error, and empty states, and has an opaque background so scrolling content cannot show through the controls. Its responsive height is defined by `--app-topbar-height`; the desktop post composer uses the same value to stay 24px below the header while scrolling. The bell subscribes to authenticated SignalR post-upload notifications and post-owner comment/reaction notifications, and also loads persisted notification history and unread counts from the API. Selecting a notification opens its post at `/posts/:postId`; the post detail page reuses the feed's post card and keeps comments expanded.

Feature-specific components, hooks, services, and types live in `src/features/<feature>/`. Route-level screens remain in `src/pages/`, while the API client, Zustand auth store, shared UI, and cross-feature helpers remain in their shared top-level folders. Cross-feature hooks live in `src/hooks/` (`useMediaQuery`, `useSwipe`).

On phones (≤640px), `AuthenticatedLayout` also shows the brand in the shared top bar, and the sidebar becomes an off-canvas drawer with a backdrop. The drawer closes after navigation, when you tap the backdrop, or when you press Escape.

The mobile header lays out the brand and compact language and notification controls in one row, with 32px buttons, 16px icons, and safe-area offsets. The notification panel stays inside the viewport and scrolls independently; at widths up to 400px the header shows only the brand mark to avoid crowding.

Protected media uses the authenticated query-token URL form because browser `<img>` and `<video>` elements cannot attach an Authorization header.

## Admin and theme details

- Admin pages require the backend admin policy and a JWT with `role: admin`.
- Post management has no enclosing panel or visible page heading. Cards flow left to right and wrap with available width, using a 272px baseline (the former three-column card size) and shrinking on narrow screens. Column counts are automatic; saved manual column settings are no longer used. Pagination uses server-side offsets and saves the page size (10, 20, 50, or 100) locally. Shared pagination controls use Animate UI's pagination primitive for the sliding active-page indicator and its reduced-motion crossfade.
- Post-management pagination sits in a fixed bottom footer alongside the compact `10 / page` selector. The footer follows the sidebar width and reserves content clearance; controls wrap on narrow screens. Shared pagination uses an outlined active page, neighboring page numbers, and non-interactive ellipses without an extra page picker.
- On phones (≤640px), all post-management cards (active and deleted) keep the thumbnail, date, deleted status when applicable, author, media count, and all actions while hiding the caption, comments, and extra deletion details. Desktop cards retain the full details.
- Post-management All / Image / Video filters keep tab semantics and arrow-key navigation. An Animate UI Highlight surface follows mouse hover and keyboard focus, inspired by the Navigation Menu primitive; a separate underline identifies the selected filter. Touch does not trigger hover, and reduced motion disables sliding.
- Deleted-media previews use the existing media endpoint with `includeDeleted=true`; the backend validates admin access before bypassing soft-delete filters.
- Deleted media streams from stored trash paths without restoration, and caching is disabled for deleted-media requests.
- Global styles and theme tokens are in `src/styles/global.css`; all UI text is white in dark mode, while light mode retains its theme-aware text colors. Follow the existing Zeneth AI-inspired theme tokens when adding styles.
- UI copy supports English and Vietnamese through `src/context/LocaleContext.tsx`. `LocaleProvider` persists the language in `shinigacim.language` and updates the document language; use `useLocale().t()` for user-facing text. The globe control sits beside notifications and is also available on sign-in and registration screens.
- The default neutral hover background is `var(--surface-hover)`, shared by sidebar controls, post-filter highlights, and ghost buttons (5% white in dark mode; 5% black in light mode). Post-filter tabs use Animate UI Image and Clapperboard icons with whole-tab hover animation.
- Sidebar styles live in `src/styles/sidebar.css`. `AuthenticatedLayout` owns the shared Animate UI sidebar provider; the sidebar spacer is a sibling of the fixed panel so content and footer stay aligned with its collapse timing. Narrow screens start with a compact rail that can expand over the content.
- Icon-bearing controls use `AnimateIcon animateOnHover asChild` around the whole button, link, or label. Child icons inherit the control's animation context; do not attach a separate hover trigger to the SVG. Loading spinners retain their continuous loading behavior.
- The feed has one heart reaction button with Animate UI press and particle effects. Clicking toggles the heart and clears any previous personal reactions before adding it. This single-selection behavior is enforced by the frontend using the existing API, not an atomic backend constraint. Each successful mutation updates the feed even if a later request fails.
- The home feed automatically appends posts in batches of 5 when its end enters the viewport. There are no page-size or pagination controls. Loading failures keep existing posts visible and offer a retry; the final batch ends with "No more posts to show." Creating or deleting a post refreshes the accumulated feed to keep server offsets consistent.

For shared guidance, see [architecture.md](../Instructions/architecture.md) and [conventions.md](../Instructions/conventions.md).
