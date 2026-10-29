# Frontend Project Reference

Use the [frontend overview skill](../.agents/skills/03-fe-01-readfirst/SKILL.md) for
architecture, conventions, and validation guidance. This page maps the current client.

## Current file locations

| Area | Path |
| --- | --- |
| App shell and routing | `src/App.tsx` |
| API client | `src/services/api.ts` |
| Authentication | `src/features/auth/`, `src/store/authStore.ts` |
| Albums | `src/features/albums/` |
| Media library | `src/features/media/` |
| Upload management | `src/features/uploads/` |
| Pages | `src/pages/` |
| Shared UI and layout | `src/components/` |
| Locale and theme | `src/context/` |
| Shared styles | `src/styles/` |

## Key behavior

- Home (`/`) lists albums the signed-in user owns and public albums. Each card loads
  only its preview image; opening a card navigates to `/albums/:albumId`, where media
  loads as the user scrolls. Album owners can hold a tile or press Shift+Space to
  select media, then remove selected items from the album.
- Albums can be private or public, can choose a preview from their images, and support
  adding/removing media. Album APIs are under `/api/collections`.
- Pictures, Videos, and Favorites query the signed-in user's standalone media.
  Favorites are returned newest-favorited-first. Gallery pages load more as the user
  scrolls and support bulk saving selected media to an album.
  A top-edge progress bar in Pictures, Videos, and Favorites tracks scrolling
  through the currently loaded gallery content and respects reduced-motion settings.
  Hold a tile (or press Shift+Space) to select media in Pictures, Videos, and
  Favorites. Long-press a tile to start selection, then drag across tiles to add
  media. Selection shows a compact bottom bar with heart, save-to-album,
  move-to-trash, and cancel actions; Cancel text is visible on desktop only.
  Moving selected media to trash requires confirmation; failed items stay
  selected for retry. The heart removes
  favorites when all selected items are favorited; otherwise it favorites the
  unfavorited items. Heart and save actions preserve selection, including items
  removed from the Favorites results. Inactive icons have white outlines; the
  active heart is filled red, and the bookmark is filled yellow when any selected
  media belongs to at least one owned album. Saving keeps the album picker open
  for more album changes; Done or Close dismisses it. Escape cancels selection
  when the   picker is closed. There is no selection-entry button in these gallery views.
  Successful saves in both album pickers show a localized toast with the destination album name.
- Administrators can browse deleted media under `/gallery/trash`, preview files
  without restoring them (`includeDeleted=true`), and restore or permanently delete
  items. Clicking a tile opens the fullscreen carousel with restore and delete
  icons instead of heart and save. Hold a tile (or press Shift+Space) to select
  multiple items; long-press a tile to start selection, then drag across tiles
  to add more. Confirm restore or permanent deletion from the bottom bar.
  Confirming or canceling the decision exits selection mode; failed requests keep
  the remaining items available for retry without repeating successful requests.
  Trash uses the gallery's 2px tile gaps and count-based columns: 5, 10, or 15 on
  desktop; 4 or 6 on phones, based on the number of loaded items.
- Uploads are submitted from `/uploads` as standalone media batches. The client stores
  pending file bytes in IndexedDB, uploads one file at a time, and supports retry,
  cancellation, refresh recovery, and live `UploadsChanged` updates. Users see their
  own batches; administrators can see all batches and owner names. Completed upload
  notifications are local to the browser and open `/uploads`.
- Browser media elements use the authenticated query-token URL because they cannot
  attach an Authorization header.
  `mediaPreviewUrl` adds `preview=true` for gallery tiles, video stills, album
  covers, and album pickers. These JPEG previews fit within 640 x 640 pixels.
  `mediaUrl` without the preview flag is reserved for the active fullscreen item;
  inactive carousel slides use previews. FFmpeg is required by the backend.
- Authentication uses access and rotating refresh tokens. The API client injects the
  bearer token, parses problem details, refreshes once after a 401, and clears the
  session if refresh fails.

Sign-in and registration use `PasswordInput`; each password field starts masked and
has its own localized show/hide control.

## Development and validation

From `Frontend/`:

```powershell
npm install
npm run dev
npm run build
npm test -- --run
npm run preview
```

The Vite server runs at `http://localhost:3000`; `Frontend/.env` normally sets
`VITE_API_URL=http://localhost:8000`. Vitest discovers `src/**/*.test.{ts,tsx}`.

The app can be installed as a PWA from HTTPS deployments and localhost. Its service
worker precaches the app shell and built frontend assets; authenticated data, uploads,
notifications, and protected media remain online-only. Background Sync, queued offline
writes, and native push notifications are not implemented.

## Layout, accessibility, and motion

`AuthenticatedLayout` owns the shared sidebar provider, top bar, upload runtime, and
routed content area. On phones (at most 640px), the sidebar becomes an off-canvas drawer
with a backdrop and closes after navigation, on backdrop click, or on Escape.
The open drawer keeps keyboard focus inside navigation, makes page content inert,
and returns focus to its toggle when closed. A localized skip link bypasses navigation.

Shared error states show a persistent inline message and retry action without also
emitting a toast. Pagination and refresh failures show only their matching retry action.
Failed gallery, album, and trash previews show a centered retry icon. Activating a
failed tile retries it first, then other failed tiles in display order from the start,
one request at a time. Successful previews are not reloaded. Selection gestures remain
available on failed tiles.
Upload history loading and errors retain the page heading and upload form. Mobile
gallery and album-detail tile grids use three columns. Coarse-pointer album actions
use 44px targets.

Gallery and album-detail media tiles keep fixed square bounds on hover and press.
Only their clipped image/video previews zoom smoothly without overshoot; selection markers
and video badges stay fixed. Reduced-motion settings disable this interaction animation.
Gallery, album-detail, and trash tiles unmount image/video previews outside a 200px
vertical viewport buffer and restore them on re-entry. Tile bounds, selection, and
keyboard targets remain mounted to preserve scrolling and interaction. Home album
cover images use the same buffer. Fullscreen carousel slides unload offscreen media
while always retaining the selected slide. This limits mounted media elements; the
browser still controls cached bytes and decoded-image memory.

Their fullscreen preview uses Animate UI's carousel with centered slides, 0.8 neighbor
scaling, drag navigation, animated dots, and a counter. Desktop shows three slides;
phones show one. Inactive image slides are blurred; the selected slide stays sharp.
Looping requires at least five desktop slides or three phone slides.
Shorter lists stop at their ends. Native video controls retain seeking gestures, and
videos pause when their slide stops being selected. The preview has no arrow buttons or
title, and it hides the dots for lists longer than ten items. Double-clicking the
selected image adds it to favorites. The heart button toggles favorite status. The
bookmark button opens the save-to-album dialog inside the viewer. Each icon is filled
in its color when active and drawn as a white outline otherwise. The actions sit beside
the close button on desktop and at the bottom center on phones.

Pictures, Videos, and Favorites previews use the API's filtered total for their
counter and slide labels. Swiping beyond loaded items fetches the next gallery
page, with an in-view loading state and retry action on failure. Looping and dots
remain disabled until all matching items are loaded. Closing the preview focuses
and centers the last viewed media tile in the gallery.

Use `useLocale().t()` for user-facing copy. `LocaleProvider` persists the language in
`shinigacim.language` and updates the document language. Protected media streams use
the media endpoint's authenticated query-token form.

Local icons and interactive parents use `src/components/animate-ui/icons/icon.tsx` for
shared hover/press triggers and view-entry animations in PWAs and mobile viewports
(up to 640px, matching the mobile layout). View-entry animations replay on re-entry;
explicit opt-outs remain supported. Respect reduced-motion settings and keep
loading indicators under their existing CSS animation control.

## Styling

Global theme tokens live in `src/styles/global.css`; sidebar styling is in
`src/styles/sidebar.css`. Both themes use neutral surfaces, distinct strong/body/muted
text, and theme-aware borders and focus rings. Use `--focus-ring` for keyboard focus,
`--theme-icon` and `--notification-icon` for shell icons, and `--text-on-danger` on
filled danger controls. Popovers use `--shadow-popover`.
