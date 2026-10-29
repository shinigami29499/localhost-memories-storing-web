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
  is fetched in pages.
- Albums can be private or public, can choose a preview from their images, and support
  adding/removing media. Album APIs are under `/api/collections`.
- Pictures, Videos, and Favorites query the signed-in user's standalone media.
  Favorites are returned newest-favorited-first. Gallery pages load more as the user
  scrolls and support bulk saving selected media to an album.
- Administrators can browse deleted media under `/gallery/trash`, preview files
  without restoring them (`includeDeleted=true`), and restore items.
- Uploads are submitted from `/uploads` as standalone media batches. The client stores
  pending file bytes in IndexedDB, uploads one file at a time, and supports retry,
  cancellation, refresh recovery, and live `UploadsChanged` updates. Users see their
  own batches; administrators can see all batches and owner names. Completed upload
  notifications are local to the browser and open `/uploads`.
- Browser media elements use the authenticated query-token URL because they cannot
  attach an Authorization header.
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

Use `useLocale().t()` for user-facing copy. `LocaleProvider` persists the language in
`shinigacim.language` and updates the document language. Protected media streams use
the media endpoint's authenticated query-token form.

Local icons and interactive parents use `src/components/animate-ui/icons/icon.tsx` for
shared hover/press or PWA view-entry triggers. Respect reduced-motion settings and keep
loading indicators under their existing CSS animation control.

## Styling

Global theme tokens live in `src/styles/global.css`; sidebar styling is in
`src/styles/sidebar.css`. Both themes use neutral surfaces, distinct strong/body/muted
text, and theme-aware borders and focus rings. Use `--focus-ring` for keyboard focus,
`--theme-icon` and `--notification-icon` for shell icons, and `--text-on-danger` on
filled danger controls. Popovers use `--shadow-popover`.
