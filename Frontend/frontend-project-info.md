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

Sign-in and registration use the shared `PasswordInput` for password and confirmation
fields. Each field starts masked and has an independently controlled show/hide button
with localized labels. Eye icons use a subtle blink transition; reduced-motion users
get an immediate icon change. Toggling preserves input values, validation, and autocomplete.

From `Frontend/`:

```powershell
npm install
npm run dev
npm run build
npm run preview
```

The Vite development server runs at `http://localhost:3000`. `Frontend/.env` normally sets `VITE_API_URL=http://localhost:8000`.

Vitest discovers `src/**/*.test.{ts,tsx}` and uses the Node environment. For supported test commands and validation policy, refer to the frontend overview skill.

The frontend is installable as a standalone PWA from HTTPS deployments and localhost. On install, its service worker precaches the app shell and built frontend assets so the UI can start offline. Feed data, authentication, uploads, notifications, and protected media remain online-only. The service worker does not cache API responses or protected media.

Standalone Windows installation is supported through Edge or Chrome; no native Windows package exists. Background Sync, queued offline writes, and native push notifications are not implemented. See the [frontend overview skill](../.agents/skills/03-fe-01-readfirst/SKILL.md#pwa-support-and-limits) for safety constraints and prerequisites before expanding PWA support.

## API client details

Request flow:

```text
Page or component
    → feature query hook or resource service (src/features/*)
    → API client (src/services/api.ts)
    → Backend REST API
```

The API client handles bearer-token injection, problem-details parsing, single-flight token refresh after a 401, and one retry of the original request. Successful refresh replaces the stored session tokens; failed authentication clears the session.

The feed's `NewPostForm` submits its caption and all selected media as one tracked post
submission through `postService.submitTracked` without leaving the feed.
Successful completion shows a toast if the current route is the feed (`/`).
On other routes, completion adds a user-scoped notification to the bell instead.
These upload notifications persist in this browser, remain separate from server
notification history, and open the completed post (or `/uploads` if no post is available).
Opening the bell marks local upload notifications as read without sending their IDs to the API.
**Sync > Upload** opens this watcher; it is not a separate file-upload composer.
The watcher fills the available page width without a create-post button. Its batch
list scrolls above the shared management pagination, with numbered pages and 10,
20, or 50 batches per page. The page size is saved as `uploads.limit` in localStorage;
changing it returns to page one. Live updates keep the current page within range.
The list shows each post submission's batch, caption, post link, and individual file
progress, with retry/cancel controls on the same row as each file's progress bar.
Administrators also see owner usernames. Active batches start expanded; previous
batches have an icon-only **View history** toggle with an accessible label and
tooltip for file results, errors, and retry counts. History uses the shared Animate UI
collapsible with subtle height/fade motion and reduced-motion support. The toggle is
borderless, and **View post** is a prominent secondary link button.
Each batch has independent file pagination fixed at five files per page, without
a page-size selector. Batch GUIDs stay on one line, and the **View post** button
is scaled to 1.3 times its original size.
Batch fields reflow based on card width, including when the sidebar reduces space.
The batch GUID uses two lines, and the status badge is centered below its label.
Files show successful uploads out of the total (for example, `0/40` or `40/40`)
instead of separate summary counters for each file status.
The authenticated upload runtime sends one file at a time and invalidates feed,
post-detail, and admin-post queries after each successful attachment. File bytes remain
in IndexedDB until success or cancellation so retries and refresh recovery use the
same browser profile. Processing requires an open authenticated app tab; server records
and completed results remain persisted after closing the browser. The legacy
`/uploads/new` URL redirects to monitoring rather than creating standalone uploads.
Cross-tab coordination uses Web Locks with `ifAvailable` only: browsers reject combining
that option with `signal`. Runtime cancellation is checked in the granted-lock callback;
cleanup stops processing and releases the lock when that callback returns.

The top-right notification bell sits beside the language toggle in the shared sticky authenticated header. The header reserves its own row above every routed page, including loading, error, and empty states, and has a transparent background so the background pattern remains visible. The authenticated shell fills the dynamic viewport; routed content scrolls independently below the header and cannot show through it. Its responsive height is defined by `--app-topbar-height`; the desktop post composer stays 24px below the top of the content scroll area. The bell subscribes to authenticated SignalR post-upload notifications and post-owner comment/reaction notifications, and also loads persisted notification history and unread counts from the API. Selecting a notification opens its post at `/posts/:postId`; the post detail page reuses the feed's post card and keeps comments expanded.

Feature-specific components, hooks, services, and types live in `src/features/<feature>/`. Route-level screens remain in `src/pages/`, while the API client, Zustand auth store, shared UI, and cross-feature helpers remain in their shared top-level folders. Cross-feature hooks live in `src/hooks/` (`useMediaQuery`, `useSwipe`).

On phones (≤640px), `AuthenticatedLayout` also shows the brand in the shared top bar, and the sidebar becomes an off-canvas drawer with a backdrop. The drawer closes after navigation, when you tap the backdrop, or when you press Escape.

The mobile drawer and its toggle animate transforms instead of layout properties. Drawer width and navigation sections stay stable during opening and closing; desktop retains Animate UI's collapse and highlight behavior. A six-toggle synthetic sample at 390 × 844 with 4× CPU throttling reduced layout passes from 307 to 6. This is not a physical-device FPS guarantee.

The theme control keeps the left-to-right palette reveal using native View Transitions with Animate UI's collapse timing (280ms at the default tempo). Local transition handling replaces the fixed-duration ThemeToggler primitive so overlapping toggles are blocked and interrupted transitions still apply and persist the selected theme. Reduced motion, unsupported browsers, and hidden documents switch without a page wipe. A transform-only theme-slide experiment did not improve the measured p95 frame interval (12.2ms in both samples), so the clip reveal was retained.

The mobile header lays out the brand and compact language and notification controls in one row, with 32px buttons, 16px icons, and safe-area offsets. The notification panel stays inside the viewport and scrolls independently; at widths up to 400px the header shows only the brand mark to avoid crowding.

Protected media uses the authenticated query-token URL form because browser `<img>` and `<video>` elements cannot attach an Authorization header.

## Admin and theme details

- Admin pages require the backend admin policy and a JWT with `role: admin`.
- Post management has no enclosing panel or visible page heading. A centered grid up to 1424px wide fits five 272px cards with 16px gaps; wrapped rows start at the grid's left edge. Cards shrink on narrow screens. Column counts are automatic; saved manual column settings are no longer used. Pagination uses server-side offsets and saves the page size (10, 20, or 50) locally. A previously saved size of 100 falls back to 10. Shared pagination controls use Animate UI's pagination primitive for the sliding active-page indicator and its reduced-motion crossfade.
- Post-management pagination sits in a persistent bottom footer alongside the compact `10 / page` selector. Cards scroll in a separate area above the transparent footer, so only the background pattern shows behind its controls. The footer follows the available content width; controls wrap on narrow screens. Shared pagination uses an outlined active page, neighboring page numbers, and non-interactive ellipses without an extra page picker.
- User management reuses the same persistent pagination footer and scrollable content layout. Users are paged locally after status and search filters, while summary and tab counts cover all accounts. Page size (10, 20, or 50) is saved separately under `admin-users.limit`; invalid saved sizes fall back to 10. Changing filters or page size resets to page one, and moderation actions clamp the current page when results shrink.
- On phones (≤640px), all post-management cards (active and deleted) keep the thumbnail, date, deleted status when applicable, author, media count, and all actions while hiding the caption, comments, and extra deletion details. Desktop cards retain the full details.
- Post-management All / Image / Video filters keep tab semantics and arrow-key navigation. An Animate UI Highlight surface follows mouse hover and keyboard focus, inspired by the Navigation Menu primitive; a separate underline identifies the selected filter. Touch does not trigger hover, and reduced motion disables sliding.
- Deleted-media previews use the existing media endpoint with `includeDeleted=true`; the backend validates admin access before bypassing soft-delete filters.
- Deleted media streams from stored trash paths without restoration, and caching is disabled for deleted-media requests.
- Global styles and theme tokens are in `src/styles/global.css`. Light mode uses the supplied `#1C1C1C`, `#DADDD8`, `#ECEBE4`, `#EEF0F2`, and `#FAFAFF` palette; dark mode uses the supplied `#0F0F0F`, `#2B2B2B`, `#4D4D4D`, `#777777`, and `#DEDEDE` palette. Dark text uses `#DEDEDE` and borders use `#777777`; light text and borders remain solid black. Nested surfaces use contrasting palette steps so adjacent controls remain distinct.
- UI copy supports English and Vietnamese through `src/context/LocaleContext.tsx`. `LocaleProvider` persists the language in `shinigacim.language` and updates the document language; use `useLocale().t()` for user-facing text. The globe control sits beside notifications and is also available on sign-in and registration screens.
- The default neutral hover background is `var(--surface-hover)`, shared by sidebar controls, post-filter highlights, and ghost buttons (14% #DEDEDE in dark mode; 12% #1C1C1C in light mode). Post-filter tabs use Animate UI Image and Clapperboard icons with whole-tab hover animation.
- Sidebar styles live in `src/styles/sidebar.css`. `AuthenticatedLayout` owns the shared Animate UI sidebar provider; the sidebar spacer is a sibling of the fixed panel so content and footer stay aligned with its collapse timing. Narrow screens start with a compact rail that can expand over the content.
- Icon-bearing controls use `AnimateIcon animateOnHover asChild` around the whole button, link, or label. Child icons inherit the control's animation context; do not attach a separate hover trigger to the SVG. Loading spinners retain their continuous loading behavior.
- The feed has one heart reaction button with Animate UI press and particle effects. Clicking toggles the heart and clears any previous personal reactions before adding it. This single-selection behavior is enforced by the frontend using the existing API, not an atomic backend constraint. Each successful mutation updates the feed even if a later request fails.
- The home feed automatically appends posts in batches of 5 when its end enters the viewport. There are no page-size or pagination controls. Loading failures keep existing posts visible and offer a retry; the final batch ends with "No more posts to show." Creating or deleting a post refreshes the accumulated feed to keep server offsets consistent.

For shared guidance, see [architecture.md](../Instructions/architecture.md) and [conventions.md](../Instructions/conventions.md).
