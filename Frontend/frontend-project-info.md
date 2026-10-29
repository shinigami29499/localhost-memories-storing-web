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
The list shows each post submission's batch, post link, and individual file
progress. Compact batch summaries keep fields on one row when space allows and reflow
on narrower cards. File rows use a type tile, filename/details, percentage and retry/
cancel controls above a full-width progress bar.
Administrators also see owner usernames. Active batches start expanded; previous
batches have an icon-only **View history** toggle with an accessible label and
tooltip for file results, errors, and retry counts. History uses the shared Animate UI
collapsible with subtle height/fade motion and reduced-motion support. The toggle is
borderless, and **View post** is a prominent secondary link button.
Each batch has independent file pagination fixed at five files per page, without
a page-size selector. The **View post** button is scaled to 1.3 times its original size.
The batch summary includes a sequential ID that continues across pages, hides the
batch GUID, shows only the creation date, and centers status under its label.
The expand/collapse chevron appears before the sequential ID column.
Fields reflow when the sidebar reduces available space.
Batch progress shows successful uploads out of the total (for example, `0/40` or
`40/40`) in place of a separate Files summary; its bar tracks the same file count.
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

Post images remain full-size inline. Clicking an image opens `MediaCarousel`, which uses
Animate UI's Embla integration with drag navigation, looping, animated dots, and a sliding
counter. All three visible slides share Animate UI's scroll-driven scale animation
(`scale: 0.45`, `visible: 3`), with an enlarged center overlapping the smaller neighbors.
Media fills the available slide area with its aspect ratio preserved, including upscaling small originals.
Media elements fit their intrinsic aspect ratio so rounded corners clip the visible image,
including side previews. Clicking a visible side navigates in that direction.
Clicking outside the media and tracking controls closes the preview; dragging does not dismiss it.
Small albums repeat track entries to meet Embla's minimum
loop length while retaining one animated dot per original media item and logical counts.
Images remain uncropped. The viewer is transparent except for the compact
tracking controls and modal backdrop. Video controls retain
native seeking, and videos pause when their slide loses selection.

**Gallery** in the sidebar is a collapsible group for every signed-in user with
**Pictures** (`/gallery`), **Videos** (`/gallery/videos`), **Favorites**
(`/gallery/favorites`), **Saved** (`/saved`), and, for administrators only,
**Trash** (`/gallery/trash`). Pictures, Videos, and Favorites share `GalleryPage`
(`view` prop) and the public feed listing, not the admin listing: they show
community media without post details, moderation controls, or deleted-media
access; posts without media are omitted. Gallery tiles are square. Selecting a
tile opens a full-screen carousel (`GalleryLightbox`) over every media file in the
currently shown day groups, starting at that post; its "Open post" button links
to the post being viewed. Favorites has All/Image/Video filters; Pictures shows all media
without filter tabs. The filter is sent as `mediaKind` so the server returns only
matching posts, and image/video filters show only matching media within each
post. Videos always requests `mediaKind=video`. Favorites lists posts the current
user has hearted (`GET /api/posts/favorites`). Posts are grouped by local
creation day (Today, Yesterday, then dates). The first 5 day groups show
initially; scrolling to the end reveals 5 more and loads further 20-post batches
as needed (`useGalleryFeed`). Saved posts show a bookmark in the tile's top-right
corner; selecting it opens the only matching collection or a chooser when the post
is saved in multiple collections. There are no pagination controls.

**Trash** (`src/pages/gallery/TrashPage.tsx`) replaces the former Manage posts
page and lists only soft-deleted posts (`status=deleted`). Administrators can
preview, restore, or permanently delete them. Deleting and restoring posts and
media are admin-only in both the UI and the API; post cards show the delete
button only to administrators.

**Users** (`/users`, `src/pages/users/UsersPage.tsx`) replaces Manage users and is
visible to every signed-in user. Approve and delete actions render only for
administrators and remain `[RequireAdmin]` on the API. The old `/admin/users`
and `/admin/posts` URLs redirect to `/users` and `/gallery/trash`.

**Saved** (inside the Gallery group) opens `/saved`, which lists collections as preview cards
(My collections / Public collections tabs, plus **New collection**). The Public tab
shows other users' public collections with their owner; your own public collections
stay in My collections, where the pencil button on each card edits it.
The three-dot menu in every post card header (feed and post detail) includes
**Save to collection**, which opens a dialog to add or
remove the post from your collections, or create a new collection containing it.
The menu sits left of the delete button when deletion is allowed, and at the
right edge otherwise. The reaction bar contains only reactions and comments.
`/saved/:collectionId` shows the collection's posts as a paginated gallery grid.
Owners can edit the name, public/private visibility, and preview image, remove
posts, copy a share link for public collections, and delete the collection.
A collection's preview is its custom preview image when set; otherwise it is the
first image of the earliest saved post. The editor offers images from the first
100 saved posts. Code lives in `src/features/collections/` and `src/pages/saved/`.

The mobile drawer and its toggle animate transforms instead of layout properties. Drawer width and navigation sections stay stable during opening and closing; desktop retains Animate UI's collapse and highlight behavior. A six-toggle synthetic sample at 390 × 844 with 4× CPU throttling reduced layout passes from 307 to 6. This is not a physical-device FPS guarantee.

The theme control keeps the left-to-right palette reveal using native View Transitions with Animate UI's collapse timing (280ms at the default tempo). Local transition handling replaces the fixed-duration ThemeToggler primitive so overlapping toggles are blocked and interrupted transitions still apply and persist the selected theme. Reduced motion, unsupported browsers, and hidden documents switch without a page wipe. A transform-only theme-slide experiment did not improve the measured p95 frame interval (12.2ms in both samples), so the clip reveal was retained.

The mobile header lays out the brand and compact language and notification controls in one row, with 32px buttons, 16px icons, and safe-area offsets. The notification panel stays inside the viewport and scrolls independently; at widths up to 400px the header shows only the brand mark to avoid crowding.

Protected media uses the authenticated query-token URL form because browser `<img>` and `<video>` elements cannot attach an Authorization header.

## Admin and theme details

- The theme toggle uses Animate UI's default Moon and Sun icon animations, without a custom icon spin, scale, or blur transition. Icon colors and the page-wide palette reveal remain unchanged.
- The theme toggle's moon and sun center, plus the notification bell body, are filled with their current icon color.
- Admin pages require the backend admin policy and a JWT with `role: admin`.
- Trash has no enclosing panel. A centered grid up to 1424px wide fits five 272px cards with 16px gaps; wrapped rows start at the grid's left edge. Cards shrink on narrow screens. Column counts are automatic; saved manual column settings are no longer used. Pagination uses server-side offsets and saves the page size (10, 20, or 50) locally. A previously saved size of 100 falls back to 10. Shared pagination controls use Animate UI's pagination primitive for the sliding active-page indicator and its reduced-motion crossfade.
- Trash pagination sits in a persistent bottom footer alongside the compact `10 / page` selector. Cards scroll in a separate area above the transparent footer, so only the background pattern shows behind its controls. The footer follows the available content width; controls wrap on narrow screens. Shared pagination uses an outlined active page, neighboring page numbers, and non-interactive ellipses without an extra page picker.
- The Users page reuses the same persistent pagination footer and scrollable content layout. Users are paged locally after status and search filters, while summary and tab counts cover all accounts. Page size (10, 20, or 50) is saved separately under `users.limit`; invalid saved sizes fall back to 10. Changing filters or page size resets to page one, and moderation actions clamp the current page when results shrink. Mobile rows use compact cards that group role/status and joined/actions side by side where width allows; very narrow screens keep the fields stacked.
- Trash cards show the thumbnail, date, author, and restore/permanent-delete actions. Captions, media and comment counts, and the deleted status badge are omitted; thumbnail clicks still open media preview. Deleted cards retain their deletion details on desktop.
- Post filters are collapsed by default on the right side of the media controls. They use the admin user list for username options and filter by a creation-date range; dates follow the browser's local time zone. Applying filters resets pagination.
- Collapsed filters indicate when filters are active. Media controls contain Image and Video only; with neither selected, all posts on the current server page show. Selecting an active media control again clears it. Controls use pressed-button semantics, and an Animate UI Highlight follows mouse hover and keyboard focus. Touch does not trigger hover, and reduced motion disables sliding.
- Deleted-media previews use the existing media endpoint with `includeDeleted=true`; the backend validates admin access before bypassing soft-delete filters.
- Deleted media streams from stored trash paths without restoration, and caching is disabled for deleted-media requests.
- Global styles and theme tokens are in `src/styles/global.css`. Both themes use neutral surfaces with distinct strong, body, and muted text. Dark mode pairs charcoal surfaces with a light primary action; light mode pairs pale surfaces with a dark primary action. Decorative borders use `--border`/`--border-card`; interactive outlines use the higher-contrast `--border-control`. Use `--focus-ring` for keyboard focus, `--theme-icon` and `--notification-icon` for shell icons, and `--text-on-danger` on filled danger controls rather than `--text-on-accent`. Popovers share the theme-aware `--shadow-popover`. Typography retains the system font stack, with 1.6 body line-height and balanced introductory headings; narrow-screen inputs use 1rem to avoid mobile focus zoom.
- The shell keeps selected navigation distinct from neutral hover with an inset marker and accent wash. Header controls have 44px targets on phones and coarse-pointer devices. The mobile header reserves 68px plus the top safe-area inset, and the notification panel positions below that shared height.
- UI copy supports English and Vietnamese through `src/context/LocaleContext.tsx`. `LocaleProvider` persists the language in `shinigacim.language` and updates the document language; use `useLocale().t()` for user-facing text. The globe control sits beside notifications and is also available on sign-in and registration screens.
- The default neutral hover background is `var(--surface-hover)`, shared by sidebar controls, post-filter highlights, and ghost buttons (14% #DEDEDE in dark mode; 12% #1C1C1C in light mode). Post-filter tabs use Animate UI Image and Clapperboard icons with whole-tab hover animation.
- Sidebar styles live in `src/styles/sidebar.css`. `AuthenticatedLayout` owns the shared Animate UI sidebar provider; the sidebar spacer is a sibling of the fixed panel so content and footer stay aligned with its collapse timing. Narrow screens start with a compact rail that can expand over the content.
- Icon-bearing controls use `AnimateIcon animateOnHover asChild` around the whole button, link, or label. Child icons inherit the control's animation context; do not attach a separate hover trigger to the SVG. Loading spinners retain their continuous loading behavior.
- The feed has one heart reaction button with Animate UI press and particle effects. Clicking toggles the heart and clears any previous personal reactions before adding it. This single-selection behavior is enforced by the frontend using the existing API, not an atomic backend constraint. Each successful mutation updates the feed even if a later request fails.
- The home feed automatically appends posts in batches of 5 when its end enters the viewport. There are no page-size or pagination controls. Loading failures keep existing posts visible and offer a retry; the final batch ends with "No more posts to show." Creating or deleting a post refreshes the accumulated feed to keep server offsets consistent.

For shared guidance, see [architecture.md](../Instructions/architecture.md) and [conventions.md](../Instructions/conventions.md).
