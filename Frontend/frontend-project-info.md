# Frontend Project Reference

Use the [frontend overview skill](../.agents/skills/03-fe-01-readfirst/SKILL.md) for
architecture, conventions, and validation guidance. This page maps the current client,
including local source changes. Paths below are relative to `Frontend/`.

## Current file locations

| Area | Path |
| --- | --- |
| App shell and routing | `src/App.tsx` |
| Entry point and service-worker registration | `src/main.tsx` |
| API client | `src/services/api.ts` |
| Authentication | `src/features/auth/`, `src/store/authStore.ts` |
| Albums | `src/features/albums/` |
| Media library | `src/features/media/` |
| Photo locations | `src/features/locations/` |
| Food places | `src/features/food/` |
| Upload management | `src/features/uploads/` |
| Browser-local upload notifications | `src/features/notifications/uploadNotificationStore.ts` |
| Pages | `src/pages/` |
| Shared UI and layout | `src/components/` |
| Locale and theme | `src/context/` |
| Shared styles | `src/styles/` |
| Media URL helpers | `src/utils/media.ts` |
| Shared hooks and class-name helper | `src/hooks/`, `src/lib/utils.ts` |
| PWA shell | `public/service-worker.js`, `public/manifest.webmanifest`, `public/pwa-icon*` |
| Build, development proxy, and test discovery | `vite.config.ts`, `package.json` |

## Route and source map

`src/App.tsx` owns route guards and theme, locale, query, animation, and toast providers.
Protected pages share `AuthenticatedLayout`; only Trash has an admin route guard.
Every protected page except Home is lazy-loaded, and `AuthenticatedLayout` renders the
shared `Suspense` fallback for them.

| Route | Page source | Feature entry points |
| --- | --- | --- |
| `/` | `src/pages/home/HomePage.tsx` | `features/albums/components/AlbumFeedPost.tsx`, `features/albums/hooks/useAlbums.ts` |
| `/library/album` | `src/pages/albums/AlbumsPage.tsx` | `features/albums/components/AlbumCard.tsx`, `features/albums/components/AlbumFormDialog.tsx` |
| `/library/album/:albumId` | `src/pages/albums/AlbumPage.tsx` | `features/albums/components/AlbumCaption.tsx`, `features/albums/hooks/useAlbums.ts` |
| `/library/gallery`, `/library/gallery/videos`, `/library/gallery/favorites` | `src/pages/gallery/GalleryPage.tsx` | `features/media/hooks/useMedia.ts`, `features/media/hooks/useMediaSelectionDrag.ts` |
| `/library/gallery/trash` | `src/pages/gallery/TrashPage.tsx` | `features/media/services/mediaService.ts` |
| `/sync/upload` | `src/pages/uploads/UploadManagementPage.tsx` | `features/uploads/components/UploadBatchCard.tsx`, `features/uploads/components/UploadActivityDialog.tsx`, `features/uploads/services/uploadService.ts` |
| `/location/travel` | `src/pages/locations/LocationsPage.tsx` | `features/locations/hooks/useLocations.ts`, `features/locations/components/LocationMap.tsx`, `features/locations/components/LocationEditor.tsx` |
| `/location/food` | `src/pages/food/FoodPage.tsx` | `features/food/hooks/useFoodPlaces.ts`, `features/locations/hooks/useHomeLocation.ts`, `features/food/components/FoodMap.tsx`, `features/food/components/FoodVisitHistory.tsx`, `features/food/components/FoodPlaceDialog.tsx`, `features/food/components/FoodPlaceEditor.tsx`, `features/food/components/FoodImagePicker.tsx`, `features/food/components/StarRating.tsx` |
| `/users` | `src/pages/users/UsersPage.tsx` | `features/users/services/userService.ts` |
| `/profile` | `src/pages/profile/ProfilePage.tsx` | `features/users/components/AvatarPicker.tsx`, `features/users/services/userService.ts` |
| `/login`, `/register` | `src/pages/login/LoginPage.tsx`, `src/pages/register/RegisterPage.tsx` | `features/auth/services/authService.ts`, `components/ui/PasswordInput.tsx` |

Feature entry points in this table are under `src/`. Previous `/gallery`, `/albums`,
`/locations`, `/food`, and `/uploads` routes redirect to these sidebar-based routes.
Legacy `/saved` and `/saved/:albumId` still redirect to album routes; `/uploads/new`
and `/admin/users` redirect to `/sync/upload` and `/users`.

## Shared behavior and API boundaries

| Concern | Source and boundary |
| --- | --- |
| Session and token refresh | `src/store/authStore.ts`, `src/services/api.ts`; `/api/auth` |
| Account avatars | `src/components/common/UserAvatar.tsx` renders `react-nice-avatar` locally from an account seed (user ID for existing accounts). The profile picker previews choices, cancels drafts, and saves through `PUT /api/users/me/avatar`. `GET /api/users/me` reloads the saved profile; login/refresh and user/owner responses also include `avatarSeed`. Saving updates the persisted session and invalidates user, album, and food-place caches. No avatar service receives account data. |
| Album queries, membership, captions, previews | `src/features/albums/hooks/useAlbums.ts`, `src/features/albums/services/albumService.ts`; `/api/library/album` |
| Media queries, favorites, trash | `src/features/media/hooks/useMedia.ts`, `src/features/media/services/mediaService.ts`; `/api/library/gallery` |
| Media tiles, preview retries, fullscreen carousel | `src/features/media/components/MediaTile.tsx`, `MediaRetryProvider.tsx`, `MediaPreviewDialog.tsx` in the same folder |
| Album pickers and bulk saving | `src/features/albums/components/SaveToAlbumButton.tsx`, `SaveToAlbumDialog.tsx`, `BulkSaveToAlbumDialog.tsx` in the same folder |
| Location edits and GPS backfill | `src/features/locations/services/locationService.ts`; `PUT /api/location/travel/{mediaId}`, `POST /api/location/travel/scan` |
| Shared map location search and account home location | `src/features/locations/components/LocationSearch.tsx`, `HomeLocationMarker.tsx`, `locationSearchService.ts`, `src/features/locations/hooks/useHomeLocation.ts`, `homeLocationService.ts`; Mapbox Geocoding API and `GET`/`PUT`/`DELETE /api/location/food/home-location`. On both maps, press and drag the home marker to request a move. Holding still opens removal confirmation at 600 ms without waiting for release; starting a drag before that threshold cancels removal. Right-click or Delete/Backspace while focused also requests removal. Both actions use the shared confirmation dialog; cancel keeps the saved position. Normal click keeps the existing home controls. |
| Food place list, check-ins, current-user visit history, optional addresses, rating, notes, custom markers, linked library photos | `src/features/food/services/foodPlaceService.ts`, `src/features/food/hooks/useFoodPlaces.ts`; `/api/location/food`, `/api/location/food/visits`, `/api/location/food/{id}/visits` |
| Upload submission, progress, recovery | `src/features/uploads/services/uploadService.ts`, `uploadRuntime.ts`, `uploadFileStore.ts` in the same folder; `/api/sync/upload` |
| Mounted upload runtime and query invalidation | `src/features/uploads/components/UploadRuntime.tsx`, `src/features/uploads/hooks/useUploadRuntime.ts`; invalidates media, albums, and uploads |
| Local notification UI | `src/components/layout/NotificationBell.tsx`, `src/features/notifications/uploadNotificationStore.ts` |
| Shell and navigation | `src/components/layout/AuthenticatedLayout.tsx`, `src/components/layout/Sidebar.tsx` |
| Language, theme, shared icons | `src/context/LocaleContext.tsx`, `src/context/ThemeContext.tsx`, `src/components/animate-ui/icons/` |

Feature DTOs live with their features (`types.ts`, or `auth/types/index.ts`).
Avatar SVG layers are excluded from global icon zoom to preserve their proportions on
mobile and desktop. Sidebar avatar containers are circular and transparent; only the
avatar artwork supplies their background.
Album UI uses the backend's collection vocabulary only at its API boundary.
Posts, comments, reactions, and persisted server notifications are no longer active
client features.
The backend exposes `/hubs/notifications` and emits `UploadsChanged`, but the current
client has no SignalR subscription. The upload runtime refreshes local query state.

## Key behavior

- Travel and Food share `features/locations/components/mapControls.css`: equal
  viewport-based map heights, 54 px corner Settings/search controls with 20 px
  icons, and home above geolocation at bottom right. Search expands on hover
  (fine pointers) or focus; Settings reveals its label on hover and opens on click.
  Touch controls expand on tap, and both maps retain Mapbox Standard/street styles.
- Opening a home-marker confirmation ends the active gesture on both maps.
  Cancel and successful confirmation discard pending drag callbacks and release clicks;
  another action requires a fresh press or explicit keyboard activation.
- Home (`/`) lists albums the signed-in user owns and public albums. Each card loads
  only its preview image in a single-column feed with owner, date, and album information.
  The media count appears as a number at the preview's bottom right. Long captions
  expand and collapse with Show more/Show less, respecting reduced-motion preferences.
  Failed previews offer a text-only retry action.
  Clicking the preview opens `/library/album/:albumId`; double-clicking adds the preview image
  to favorites without navigating. The heart toggles that image's favorite state,
  and the bookmark opens the existing save-to-album picker for that image. Albums
  without previews disable both actions. Owners and admins can delete albums after
  confirmation; the underlying media remain intact. Album detail media
  loads as the user scrolls. Album owners can hold a tile or press Shift+Space to
  select media, then remove selected items from the album.
- Albums can be private or public, can choose a preview from their images or upload one
  from the edit dialog, and support adding/removing media. Uploaded preview images are
  added to the album. Album APIs are under `/api/library/album`.
- The album detail header hides absent preview images and shows a transparent caption
  area beside the album details, stacking below on narrow screens.
  Owners and viewers of public albums can edit captions inline, up to 4,000
  characters. Save persists the caption; Cancel or Escape discards the draft.
  Failed saves retain the draft for retry.
- Gallery queries the shared standalone media library for signed-in users, with All,
  Images, and Videos tabs. Favorites and Trash offer the same filters; All mixes both
  media kinds. Favorites filters to the current viewer's favorites. Results use
  media creation
  time descending, not favorite time. Gallery pages load more as the user
  scrolls and support bulk saving selected media to an album.
  A top-edge progress bar in Gallery and Favorites tracks scrolling
  through the currently loaded gallery content and respects reduced-motion settings.
  Gallery-wide Grid and Timeline view modes are available for each gallery;
  Timeline groups media created during the same minute on one event and shows time
  labels beside the center axis.
  Hold a tile (or press Shift+Space) to select media in Gallery and Favorites.
  Long-press a tile to start selection, then drag across tiles to add
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
- Administrators can browse deleted media under `/library/gallery/trash`, preview files
  without restoring them (`includeDeleted=true`), and restore or permanently delete
  items. Clicking a tile opens the fullscreen carousel with restore and delete
  icons instead of heart and save. Hold a tile (or press Shift+Space) to select
  multiple items; long-press a tile to start selection, then drag across tiles
  to add more. Confirm restore or permanent deletion from the bottom bar.
  Confirming or canceling the decision exits selection mode; failed requests keep
  the remaining items available for retry without repeating successful requests.
  Gallery, album-detail, and trash grids use five columns with 8px gaps and
  rounded tiles on desktop, and three columns on phones.
- Uploads are submitted from `/sync/upload` as standalone media batches. The Select
  files button on the left opens the file picker; the adjacent Upload media button
  submits selected files, with a removable selected-file count chip beside it; the
  calendar-day filter and the Activity button sit on the right, without a
  surrounding file-selection panel. A creation-date
  chooser filters all history pages using the viewer's local calendar day; the
  Remove filter icon button appears only while a date is set and clears it.
  Changing or clearing the date resets pagination.
  The client stores
  pending file bytes in IndexedDB, uploads one file at a time, and supports retry,
  cancellation, refresh recovery, and query invalidation after upload changes. Users see their
  own batches; administrators can see all batches and owner names. Completed upload
  notifications are local to the browser and open `/sync/upload`. The toolbar's Activity
  button opens a dialog with a responsive 36-week desktop or 12-week mobile heatmap
  of completed files that can retry if upload history cannot load.
- Browser media elements use the authenticated query-token URL because they cannot
  attach an Authorization header.
  `mediaPreviewUrl` adds `preview=true` for gallery tiles, video stills, album
  covers, and album pickers. These JPEG previews fit within 640 x 640 pixels.
  `mediaUrl` without the preview flag is reserved for the active fullscreen item;
  inactive carousel slides use previews. FFmpeg is required by the backend.
- Locations (`/location/travel`) uses `useLocations` to load image pages and scan existing
  photos for GPS in batches of up to 25. Scan failures retain failed-media counts
  and expose errors; finishing a scan invalidates media queries.
  `LocationEditor` sets or clears coordinates through `locationService`. Coordinates
  come only from the map: clicking the map or dragging the draft pin picks the point,
  and the editor shows that point read-only. Saving and removing both require a
  confirmation dialog and report the result through a toast.
  Save, Remove location, and Cancel stay side by side with icons. Their labels hide
  when the available editor width cannot fit all actions; accessible names and tooltips
  remain available. Labels return when there is enough room.
  Saving successfully exits photo selection mode and keeps the map focused on the
  saved photo. Failed saves retain the selection and draft for retry.
  On desktop, Escape or a click outside the map and photo details exits photo
  selection and clears the `mediaId` request. Photo tiles still switch selection;
  map clicks still pick locations. Open dialogs and pending saves prevent
  selection dismissal, and Escape closes open map settings first.
  Cancel and other unsaved exits discard the draft without changing the saved
  location or moving the camera. Cancel is disabled during saves.
  Clicking a map photo pin previews it without opening the editor. On desktop,
  owners and admins can press and drag a photo pin more than 8 pixels to open
  editing at the dropped coordinates. This updates only the draft; saving still
  requires confirmation. Photo library tiles and `mediaId` links retain direct
  editor access, including for photos without coordinates. Mobile pins cannot
  enter editing by dragging.
  On phones (up to 640px), Locations keeps its title, subtitle, Mapbox notice,
  map, and map controls.
  Photo taps and `mediaId` links show previews without the details panel,
  photo library, location editor, or draggable draft pin. Focused pins leave room
  above them for the photo popup. Desktop photo selection and editing are unchanged.
  Owners and admins can edit photo locations; backfill scans own photos for members
  and all photos for admins.
  Locations uses Mapbox GL JS through `react-map-gl/mapbox`, with 3D Basemap as the
  default view. Its Setting control follows the sidebar styling, is collapsed
  by default, and expands to title-only Street map, 3D Basemap, and Photo markers
  controls. Hover animates their icons and slightly scales the scene buttons.
  On both maps, selecting a photo or food marker zooms to at least level 18.
  Marker previews use white-framed, 180px-wide portrait photos (3:4) in both themes
  and show localized "By {username}" attribution. Travel previews omit filenames
  and coordinates; paged gallery media includes an optional `ownerUsername`.
  Food previews retain place details and ratings.
  Street view stays flat; 3D view tilts toward the selected marker.
  The Home control clears marker focus and editing, closes map settings, switches
  to Street map, and returns to the saved home location at zoom 14 with no tilt.
  Without a saved home location, it opens the existing home setup flow.
  Outside editing, clicking or tapping outside a marker dismisses its preview on
  desktop and mobile. The first map tap dismisses a selected food preview instead
  of creating a new place. Open dialogs and pending saves prevent dismissal.
  Clearing marker selection leaves the camera unchanged; zooming occurs when
  selecting a marker, not when dismissing its preview.
  The fullscreen photo viewer always shows a location action. Located photos use a
  red filled pin with theme-default inner and outer outlines and a transparent center.
  They open `?focusMediaId=<id>` to zoom to
  the photo without entering selection mode. Unlocated photos open `?mediaId=<id>`
  in selection mode, centered on the current device location when permission allows.
  Initial device centering falls back to the saved home location or photo bounds
  when unavailable and never overrides a focused photo.
  Satellite view is not available. Photo previews appear in point-bottom map pins
  with white outlines in both themes and on hover; a draggable draft pin is also
  available. Hovered, focused, and selected photo pins grow by 10% without changing
  their images, white borders, or shadows. Home pins on both maps keep a dark
  fill, white home icon, and white border in both themes and grow on interaction.
  Keyboard focus retains a separate focus outline; reduced motion disables scale
  transitions. Photos within about 46
  screen pixels of each other share one marker that stacks them with a count badge
  and fans them out in an arc on hover, focus, badge click, or selection; at most
  eight photos are fanned and the badge keeps the full count.
  Set the public `VITE_MAPBOX_ACCESS_TOKEN` (`pk.`) in `.env.local`; never use a
  secret token.
  Map requests require internet access and WebGL. Locations cannot be edited when
  the map cannot load. Photo files stay on the local server.
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

The Vite server runs at `http://localhost:3000`. During development, `vite.config.ts`
forces a same-origin API base and proxies `/api` and `/hubs` (including WebSockets)
to `http://localhost:8000`. Production uses `VITE_API_URL`; the local environment
normally sets it to `http://localhost:8000`. Mapbox uses the public
`VITE_MAPBOX_ACCESS_TOKEN` from `.env.local`.

`npm run build` runs Vite, not a separate TypeScript type check. Vitest discovers
`src/**/*.test.{ts,tsx}` in the Node environment; DOM-dependent files opt into jsdom.
`src/test/setup.ts` runs before every file and supplies the browser APIs jsdom lacks
(`matchMedia`, `IntersectionObserver`, `ResizeObserver`, `scrollTo`, `Element.animate`,
and `Element.getAnimations`); tests still stub these globals when they need to drive
behavior.
Run tests only when explicitly requested or when the frontend overview's scope
threshold is met. Do not run browser-driven tests unless explicitly requested.
Documentation-only updates do not require a build or test run.

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
Upload history loading and errors retain the page heading and upload form. Mobile gallery and album-detail tile grids use three columns. Coarse-pointer album
actions use 44px targets.

Gallery, album-detail, and trash grids use portrait tiles with a 4:5 aspect ratio.
Selection borders follow the tiles' rounded corners. Tiles keep fixed bounds on hover and press.
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

Gallery, Favorites, and Trash previews use the API's filtered total for their
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
