# ShinigaCim UI overhaul: implementation plan

Date: 2026-11-04. Scope: frontend and supporting backend work.
Audience: a fresh implementation agent, including GPT-6.1 Sol at medium reasoning.
Status: implementation in progress. The shared theme and navigation, reduced motion, route splitting, gallery windowing, batched album membership, searchable and paged albums, paged users/places/visits, and viewport-filtered photo and place map requests are implemented. Existing array endpoints remain available. Unlocated photos have a separate paged list; map pages load more on demand. The photo query needs database execution and query-plan verification, and large marker sets still use DOM clustering. Runtime performance, visual review, backend behavior, and complete feature preservation remain unverified under the repository's restrictions. The pre-existing frontend suite has substantial failures and is being repaired as affected areas change; do not treat a successful build as full verification.

Implementation evidence: the latest frontend production build and TypeScript check pass; the backend Release build with `--no-restore` passes with no warnings. The last complete frontend suite reported 179 failures and 310 passes across 57 files; the original baseline was 223 failures and 254 passes across 26 failing files. A focused run passed 76 tests across 16 files, covering mobile navigation, map navigation and GPS, viewport bounds, visit and user paging, photo deep links, virtual gallery focus, album membership, and shared presence. Browser-driven checks and backend execution/tests remain prohibited by the repository instructions. The PNG install icons still use the previous colors; the SVG favicon and manifest colors have been updated.

## 1. Read this before implementing

Rebuild the presentation of this authenticated media library without losing its workflows, data, permissions, deep links, or platform behavior. This is an incremental overhaul of the existing React/Vite and ASP.NET Core application, not a new application or framework migration.

The user explicitly requested:

- Fewer unnecessary React renders, DOM operations, and transferred JavaScript bytes.
- Fewer animations and page transitions, with reduced-motion support.
- One theme. Remove the theme toggle.
- Only `#6A3F36`, `#C8A796`, `#F4F3EE`, `#F8E4BE`, and `#EEA988` for authored application UI colors.
- Clear importance, readable contrast, sensible conventional icons, and a comprehensive layout critique.
- Left navigation on desktop; bottom navigation on mobile.
- More simultaneous detail and desktop conveniences on larger screens.
- Preservation of all existing application functions, except the explicitly requested theme/effect reductions.
- Removal of the skill rule prohibiting borders and requiring shadows.

**Confirmed clarification:** the five-color restriction applies to application UI. Photos, videos, avatars, and map imagery retain their original colors. User-authored map marker colors/glyphs are content, not a new UI palette. Do not recolor, rewrite, or discard stored content. Map appearance controls remain functional and use palette-compliant surrounding controls.

**Conflict resolution:** desktop-only enhancements may include keyboard shortcuts, drag selection, and simultaneous detail panes. An existing mobile-accessible operation must not become desktop-only. Mobile moves secondary information into details/sheets instead of removing it. Theme choice and elaborate decorative effects are the intentional exceptions to feature preservation.

**Already changed during planning:** both `.agents/skills/03-fe-03-ui-engineering/SKILL.md` and its `.claude/skills/` mirror now allow borders, spacing, contrasting surfaces, and optional shadows. Application source was not changed by this planning task.

### Repository rules and working-tree safety

1. Read `AGENTS.md`, the required Caveman skill, and both stack overview skills before edits. Load only relevant child skills.
2. Do not read, edit, or move `Backend/Adapter/Security/` or `Backend/Scripts/`.
3. Do not add, edit, generate, or run backend tests. No API smoke tests, backend verification scripts, or `dotnet run`. API startup migrates/seeds data and creates storage directories.
4. Backend validation: focused source review and `dotnet build Backend\ShinigaCim.sln` only.
5. No Playwright or other browser-driven tests without an explicit user request. This plan is not permission to run them.
6. Frontend component/unit tests are appropriate for this large overhaul. Use focused existing tests, then the complete frontend suite once at integration.
7. Preserve existing edits. The audit started with changes to package files, shell, sidebar, transitions, buttons, toasts, locale, gallery/album/settings pages, CSS, and `debug.log`. Untracked files include `PageActionBar`, its test, sound settings/runtime/store, and an e2e spec. They belong to the working baseline. Never reset, clean, stash, or overwrite them to simplify this work.
8. Reread current source before each slice. This document records a snapshot, not a replacement for current code.
9. Source wins when older project-info documents disagree. In particular, SignalR subscriptions exist; admins can browse all albums; visit history has more operations than older guides describe.

## 2. Audit evidence and limitations

This was a source-level audit plus a production frontend build. No rendered pages, browser timings, screenshots, API calls, database execution plans, or backend tests were used. Layout critiques below are grounded in CSS/component structure; they are not claims of observed browser defects. Runtime improvements remain hypotheses until measured.

### Build baseline

`npm.cmd run build` succeeded from `Frontend/` on the existing working tree. `npm run build` initially hit PowerShell's disabled-script policy; using `npm.cmd` worked without changing policy. Installed Vite reported 6.4.5. Build took 7.24 seconds on this machine; this is not a user-facing performance metric.

| Built artifact | Minified kB | Gzip kB | Meaning |
| --- | ---: | ---: | --- |
| Entry JS `index-ITxlaE0i.js` | 770.74 | 242.64 | Large startup entry |
| React vendor | 78.56 | 26.58 | Preloaded by entry HTML |
| Query vendor | 47.26 | 14.16 | Preloaded by entry HTML |
| Motion vendor | 143.94 | 49.03 | Preloaded by entry HTML |
| Entry CSS | 129.16 | 23.71 | Shared startup styling |
| Mapbox GL | 1,926.29 | 545.30 | Large optional map dependency |
| LocationMap JS | 123.45 | 38.95 | Map feature wrapper |
| LocationMap CSS | 80.91 | 11.12 | Map styling |

The entry plus three explicit JS modulepreloads totals **332.41 kB gzip**. This is a reproducible build-output lower bound for initial JS, not a measured browser waterfall or total transitive transfer. Hashes will change; compare roles and import graphs, not filenames.

Build warnings: Settings is both statically and dynamically imported; some chunks exceed 500 kB; two SignalR purity annotations are ignored. Do not silence the chunk warning by raising the threshold. `build` is `vite build`, not TypeScript type checking. This planning pass did not run `tsc` or tests.

### Findings ranked by implementation value

| ID | Evidence | Consequence / design critique | Required response |
| --- | --- | --- | --- |
| A01 | `src/components/layout/AuthLayout.tsx` statically imports and mounts `SettingsPage` inside a closed dialog | Route laziness is defeated; permission/settings work mounts on auth screens | Load and mount settings on demand; retain settings access before login |
| A02 | `PageTransition.tsx` has ten effect options, geometry reads, root animations, observers and input listeners; callers exist at page and section levels | High complexity and potential overlapping work; transitions may delay useful content | Replace with the motion contract in section 6; migrate all helper consumers |
| A03 | `useGalleryWindow.ts` queries every retained cell and reads bounding rectangles on captured scroll events | Inner tiles are windowed, but wrapper DOM still grows with loaded items; work scales with accumulated content | Use bounded row virtualization and the actual scroll root |
| A04 | `GalleryPage.tsx` creates `useQueries` entries for every selected media ID to fetch owned album membership | Selecting N files can issue N membership requests | Add one bounded batch membership contract; do not disable existing remove/save logic |
| A05 | `PageActionBar.tsx` registers fresh props through a layout effect and animates each item's width | Extra provider updates and layout animation; shared component imports page CSS | Replace registration with stable portal placement; shared styles own the bar |
| A06 | `global.css` has dark/light palettes, red status colors, gradients, global SVG zoom, and globally hidden scrollbars | Conflicts with requested identity; icon sizes and overflow affordances are difficult to control | One semantic token system; explicit icon sizes; restore scroll affordances |
| A07 | `AuthenticatedLayout.tsx` uses a mobile off-canvas sidebar at 640px; sidebar token is 348.8px | Mobile destination access is hidden; desktop chrome consumes substantial width | Adaptive left sidebar/rail and persistent bottom navigation |
| A08 | `useLocations.ts` automatically fetches every image page in batches of 100 | Map startup scales with the entire photo library | Add bounded spatial/map data access; retain unlocated-photo workflows |
| A09 | `CollectionRepository` list methods have no page limits; `PlaceRepository` list/map/history queries materialize lists | Home, album chooser, places and history can become expensive at scale | Add compatible paged endpoints; keep old array contracts until all consumers migrate |
| A10 | `UsersPage` fetches a user array, paginates locally, polls admins every 15s, ticks the page every 5s, and opens its own hub connection | Large-list rerenders and duplicate connection ownership alongside `PresenceRuntime` | Isolate clocks; reuse one authenticated event runtime; page data server-side |
| A11 | `PlaceVisitHistory` updates `now` every second when removal is enabled | Whole history rerenders for an eligibility deadline | Schedule the next relevant deadline and recheck eligibility on activation |
| A12 | Home merges arrays during render and mounts all feed posts; media/preview features have substantial shared imports | Potential broad rerenders and eager loading | Stable derived data, selective memoization, and dialog/feature boundaries |
| A13 | `PresenceRuntime` owns live events and depends on token and locale translator; upload runtime also depends on translator | Locale/session changes may restart work; needs lifetime review | Separate resource ownership from translated presentation while preserving logout/account semantics |
| A14 | Native/PWA behavior lives in `App.tsx`, `index.html`, manifest, service worker, and Capacitor files | Theme/chunk changes can leave stale launch colors or unavailable offline chunks | Include launch assets, safe areas, Back handling and offline shell in rollout |

Preserve good foundations: feature-owned services, Query server state, Zustand client state, existing route lazy imports, shared primitives, async repositories, deterministic ordering already present in several queries, viewer-specific favorites, image previews, upload recovery, and preview cleanup/compensation. Do not replace these merely for aesthetic consistency.

## 3. Feature preservation inventory

For every row below, record implementation status, relevant existing tests, and outstanding manual verification in a companion checklist during execution. A restyled screen is incomplete if any operation disappears.

| Surface and current route | Functions to preserve | Desktop design | Mobile design |
| --- | --- | --- | --- |
| Login `/login`, registration `/register` | Validation, password visibility, pending approval, session replacement, auth errors, language and pre-login settings | Focused form up to 440px with quiet supporting brand area | One column, 16px inputs, keyboard-safe submit; no oversized artwork |
| Home `/` | Owned/public feed; admin all-album feed including private albums; cover, owner, dates, caption expansion, media count, favorite/save actions, permitted album deletion, preview retry | Readable feed up to 760px; useful metadata beside content where space allows | Same feed and actions; compact metadata, no sidebar duplicate |
| Gallery `/gallery` | Images AND videos, date grouping, incremental loading, selection, drag/hold/keyboard paths, bulk favorites, save/remove album membership, uploads, preview, retry | Dense responsive grid, header actions and selection toolbar | Two or three columns as space allows; explicit Select button and tap checkboxes; actions above bottom nav |
| Favorites `/gallery/favorites` | Caller-specific favorite list, unfavorite, bulk operations, same viewer and save behavior | Gallery pattern with clear active section | Same operations and empty-state recovery |
| Albums `/gallery/album` | Existing scope/view controls and role visibility; create/edit/privacy/cover/caption/delete; open detail | Content grid with cover, title, count, owner/privacy metadata | Two columns when readable, otherwise list; edit actions in menu |
| Album detail `/gallery/album/:albumId` | Media paging; owner membership changes; title/privacy/cover editing; public caption editing per existing policy; deletion permissions; gallery media survives album deletion | Compact cover/header, caption and metadata, then media grid | Header stacks; caption disclosure; same permission-driven controls |
| Trash `/gallery/trash` | Admin guard, deleted previews, selection, restore, permanent deletion and confirmations | Grid and explicit destructive selection bar | Same authorized operations; clear permanent-delete wording |
| Uploads `/uploads` | File selection/submission, batch/item progress, pause/resume/retry, missing-file reselection, record removal, date filter, pagination/page size, viewed/unread state | Active queue followed by history; expanded metadata when useful | Compact batch summaries with expandable items; active progress stays visible |
| Places `/location`, `/location/saved`, `/location/history` | Map, saved list/history, create/edit/delete place, name/address/note/rating/marker, linked photos, check-ins, visit details/edit/removal, existing visibility scope | Map plus 320–400px list/details pane | Map/list switch and detail sheet; history remains a dedicated section |
| Travel `/location/travel` | Located photo markers/groups, unlocated photos, GPS scan/progress/errors, manual coordinates/moves, home fallback, preview, search, geolocation, camera path, navigation | Map and photo/detail side pane | Map with compact controls and selected-item sheet; all operations remain discoverable |
| Shared map functions | Scene/appearance choices, marker visibility, grouping/spiderfy, home set/move/remove and confirmation, applying home to own unlocated images | Labeled controls; keyboard coordinate alternatives | Touch controls; no hover-only actions; map gestures do not activate app navigation |
| Directions | Driving/walking/cycling, route guidance/progress and existing controls, external Google Maps fallback | Compact route pane | Sheet with destination and next action; keep fallback when map provider fails |
| Users `/users` | Signed-in directory; admin pending filter, approve/activate/disable/delete/role changes, presence and last activity, paging | Table with explicit column headings and labeled action tooltips | User cards/disclosure with identical authorized admin actions |
| Profile `/profile` | Account details, avatar selection and password change | Two focused sections with inline status | Single column; avatar picker loads when opened |
| Settings `/settings` and auth dialog | Locale access, sound enablement/options, toast preferences, notification permission, camera/location permission guidance, photo library guidance | Grouped labeled rows | Same groups; no misleading switch suggesting browser permission can be revoked by the app |
| Notifications and presence | Upload/public-album/media/place/check-in notifications, read state, browser notification preference, refresh/navigation actions, account/session changes | Header bell and anchored panel | Header bell and sheet; badge readable, not color-only |
| Viewer/pickers/dialogs | Image/video viewing, previous/next, clipboard where supported, favorites, album save, location links, trash actions, retry; photo picker Gallery/Preview tabs and draft lifecycle | Viewer with optional detail rail, bounded dialogs | Fullscreen viewer/editor where needed; visible Close and accessible controls |
| PWA / Android | App-shell offline launch, online-only protected data, notification-click routing, safe areas, hardware Back, camera teardown, upload continuity | Responsive browser/installed app | Android WebView and installed-browser behavior remain intact |
| Errors and empty states | Route errors, 401/403/404, retry, empty collections, partial failures and offline explanations | Inline recovery near failure | Same recovery without hiding primary navigation |

### Permission and data invariants

- `/users` is not simply an admin-only route. Directory access and privileged actions differ. Keep the current service/controller authorization.
- Admin album access differs from ordinary public/private viewing. Preserve `scope=all` for admins and current view/edit distinctions. Admin read access does not imply every owner-only edit is allowed.
- Album captions have a 4,000-character limit and a broader editing policy than owner-only album settings. Preserve it.
- Standalone gallery includes shared media; favorites are per viewer. Do not convert it into an own-files-only gallery.
- Visit history includes current-user and broader history surfaces. Preserve the actual API/role policy for each. Visit editing/removal eligibility and the existing time windows are business behavior, not decoration.
- Shared home coordinate affects all authenticated accounts; applying it to existing unlocated photos is scoped. Keep confirmation copy clear about shared impact.
- Gallery/Preview picker drafts are not ordinary uploads. Preserve selected covers outside the first page, unselected draft release, cancel cleanup, shared references, last-reference deletion and rollback.
- Preserve token refresh coalescing, one retry after 401, account replacement behavior and protected media URLs. Never put tokens or protected content in service-worker caches.
- Preserve soft deletion, query filters, audit stamping, `DeleteBehavior.NoAction`, async persistence and filesystem/database compensation.
- Preserve upload item revisions, conflicting completion protection, recovery, local file storage, owner-scoped history, and server-persisted viewed status.
- Never delete data or change authorization to meet a performance budget.

### Deep-link compatibility

Keep every redirect in `App.tsx`, including `/gallery/videos`, `/library/gallery*`, `/library/album*`, `/albums*`, `/saved*`, `/sync/upload`, `/uploads/new`, `/locations`, `/food`, `/location/food`, `/place`, `/location/place`, and `/admin/users`. Preserve state/query/hash where the existing flow depends on them. Do not silently make a legacy album link point to a different album. Keep existing backend aliases as well.

## 4. Visual system: a warm media library

Intent: content-first browsing for media, efficient operation for uploads/admin screens, and focused exploration for maps. Use a quiet warm canvas, dark brown ink, modest borders, strong headings, and deliberate spacing. Avoid large promotional headers, repetitive boxed sections, translucent glass, decorative gradients, and shadows on every item.

### Exact palette and tokens

| Color | Role | Usage restrictions |
| --- | --- | --- |
| `#6A3F36` | Ink, interactive boundaries, primary action, focus, selected indicator | Primary text on ivory/cream; not normal text on peach or taupe |
| `#C8A796` | Decorative dividers, nonessential surface accents | Not normal text; not the only input boundary or selected cue on ivory |
| `#F4F3EE` | Main canvas, inputs, popup background, inverse text on brown | Default reading surface |
| `#F8E4BE` | Hover surface, highlighted information panel, selected-row wash | Brown text; essential state also needs brown outline/check/label |
| `#EEA988` | Small accent blocks, decorative highlights, non-text symbols on brown | Do not put ordinary brown text directly on this fill |

Proposed initial CSS contract, retaining existing token names to reduce migration churn:

```css
:root {
  color-scheme: light;
  --bg: #F4F3EE;
  --surface: #F4F3EE;
  --surface-raised: #F8E4BE;
  --surface-hover: #F8E4BE;
  --sidebar-bg: #F4F3EE;
  --text: #6A3F36;
  --text-strong: #6A3F36;
  --text-muted: #6A3F36;
  --accent: #6A3F36;
  --accent-strong: #6A3F36;
  --text-on-accent: #F4F3EE;
  --border: #C8A796;
  --border-control: #6A3F36;
  --focus-ring: #6A3F36;
  --accent-wash: #F8E4BE;
  --accent-decoration: #EEA988;
  --shadow-popover: none;
}
```

Inventory and map every other current token before removing it: card surfaces, danger, heart/trash, notification, selection, map controls, dialogs, toasts, charts, media controls, and auth illustrations. Do not leave undefined variables or a second raw-color vocabulary.

Use secondary text hierarchy through size, weight, placement and spacing, not low-opacity ink. No new hex, RGB, HSL, named-color, gradient-stop or color-mix output for authored UI. Avoid opacity-based surface tints and shadows that create additional designed shades. `transparent` may expose an approved underlying surface. Normal anti-aliasing, media pixels, OS controls and accessibility forced colors are not additional authored palette choices.

For overlays, use a solid ivory fullscreen surface or opaque cream surround with a brown bordered popup. Do not add a black scrim. Viewer background may be solid brown with ivory controls. Place controls over photographs/maps on an opaque approved surface; never depend on the underlying image for contrast.

### Calculated contrast, not guessed contrast

Ratios below use WCAG sRGB relative luminance and are rounded for display only. Threshold decisions must use the unrounded result.

| Pair | Ratio | Allowed use |
| --- | ---: | --- |
| Brown / ivory | 7.95:1 | Normal text, controls, focus |
| Brown / cream | 7.08:1 | Normal text, controls, focus |
| Brown / taupe | 3.96:1 | Large text or meaningful non-text only |
| Brown / peach | 4.49:1 | Fails 4.5:1 normal text; non-text or large text only |
| Taupe / ivory | 2.01:1 | Decoration only; not essential boundary/text |
| Taupe / cream | 1.79:1 | Decoration only |
| Taupe / peach | 1.13:1 | Decoration only |
| Ivory / cream | 1.12:1 | Surface difference only; add a meaningful boundary when needed |
| Ivory / peach | 1.77:1 | Decoration only |
| Cream / peach | 1.58:1 | Decoration only |

Normal text needs 4.5:1; large text needs 3:1. Essential control/state graphics need 3:1 against adjacent colors. These constraints explain why the dark brown must carry most functional meaning. See [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

### Component state rules

| State | Rendering |
| --- | --- |
| Primary action | Brown fill, ivory label/icon; only one dominant action per task area |
| Secondary action | Ivory fill, brown border and label |
| Hover | Cream fill with brown text; primary filled buttons may keep fill and add underline/inset cue |
| Active navigation | Cream surface plus brown indicator and `aria-current`; no moving pill required |
| Selected media | Brown boundary/check on an opaque ivory/cream checkbox plate |
| Focus | 2px brown outline with 2px ivory separation; inverse treatment on brown surfaces |
| Disabled | Keep readable colors; native disabled semantics, explicit unavailable state where useful, no hover affordance |
| Busy | Fixed-width action with progress icon/text; reduced motion uses static progress text |
| Success / warning / error | Brown icon and explicit status heading; ivory/cream surface; distinct symbol and wording, never green/yellow/red dependency |
| Destructive action | Trash icon plus explicit action label; confirm permanent deletion separately; separation from safe actions |

Heatmaps and status charts must have labels/tooltips and distinguishable shapes/patterns/outlines when adjacent palette fills lack contrast. A taupe square alone cannot encode critical meaning. Favorite uses heart; album membership uses bookmark; rating uses star. Do not interchange them.

### Typography and dimensions

- Keep the system font stack, including Vietnamese support. Do not add a remote font dependency.
- Body 16px/1.5; secondary metadata 14px/1.45; desktop dense-table metadata may be 13px. Mobile inputs stay at least 16px.
- Page title 28px desktop / 24px mobile, weight 650–700. Section title 20px. Avoid excessive tracking and tiny all-caps UI.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48px. Desktop page gutter 24px, mobile 16px, dense media gap 8px or 4px on narrow screens.
- Radius: 6px controls, 10px cards/panels, 12px dialogs. Circles reserved for avatars and clearly circular controls.
- Default control height 44px; touch targets 44–48px. Icons 20px, dense row icons 18px, nav icons 22px. Remove global SVG zoom.
- Keep text wrapping for labels and names; truncate only with an accessible full value. Test long Vietnamese labels, long filenames and 200% zoom.
- Borders: 1px brown for essential inputs; taupe for decorative separation; 2px for selected/focused boundaries. Default shadow is none.

## 5. Adaptive navigation and layout

### Navigation architecture

Use one shared destination definition with role-aware children. Desktop and mobile render it differently without two mounted data runtimes.

| Top-level destination | Route | Secondary destinations |
| --- | --- | --- |
| Home | `/` | Feed |
| Library | `/gallery` | Gallery, Favorites, Albums, Trash for admins |
| Places | `/location` | Map, Saved, History, Travel photos |
| Uploads | `/uploads` | Active work and history |
| More | Opens mobile menu/sheet | Users, Profile, Settings, language and Sign out |

Desktop shows Users, Profile and Settings in the lower sidebar/account area rather than a literal More destination. Notifications remain in the header. Mobile uses five persistent labeled destinations; More is a button with `aria-expanded`, not a fake route. Mark Library active for album detail and Places active for all location subroutes. A menu-owned current destination also marks More appropriately.

Use existing paths and labels where possible. “Library” is the parent grouping, not a new data concept. Three-to-five top-level mobile destinations follow [Android adaptive navigation guidance](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns).

### Breakpoints and geometry

| Width | Shell | Content behavior |
| --- | --- | --- |
| Under 768px | Bottom nav, 64px plus safe-area inset; compact 56px header | One task column, disclosure/sheets, no desktop drawer as primary navigation |
| 768–1199px | Left 80px rail with labels/tooltips; expandable sidebar if useful | Moderate grid density; no permanent detail pane unless it fits |
| 1200px and above | Left 240px sidebar, optional user collapse to 80px | Content max 1600px; map/detail and admin tables can use full available width |

Use CSS media queries for arrangement. Use `matchMedia` only when component behavior/lifetime must change. Do not use device user-agent detection. A narrow desktop window gets the compact shell; a tablet with a wide viewport gets the rail.

Choose one ordinary page scroll owner. Gallery virtualization may own its content scroller; maps have bounded map workspace and a separate list scroller. Remove nested decorative scroll-progress wrappers when they duplicate scroll ownership. Restore usable native scrollbars where content overflows.

Mobile page bottom padding must include `env(safe-area-inset-bottom)`, nav height and the actual selection-action region. Prefer CSS grid rows over stacked fixed elements. If a selection bar is sticky, place it immediately above navigation. It must never obscure the last media row or Save/Cancel. Dialogs/editors cover the shell and own their footer. Use `100dvh` and the existing viewport helper for virtual keyboard behavior; verify Android Back closes the top overlay before navigating.

### Low-fidelity layout contracts

```text
Desktop library
+----------------+--------------------------------------------------+
| Brand          | Gallery                 notifications / account  |
| Home           | Gallery  Favorites  Albums  Trash*               |
| Library        | Title/count                       Select  Upload |
| Places         | Date heading                                     |
| Uploads        | [media] [media] [media] [media] [media]           |
| Users          | Date heading                                     |
|                | [media] [media] [media] [media] [media]           |
| Profile        | Selection actions appear only during selection   |
| Settings       |                                                  |
+----------------+--------------------------------------------------+
* permission-dependent

Mobile library
+--------------------------------+
| Gallery                  bell  |
| Gallery Favorites Albums More* |
| count           Select Upload  |
| Date                           |
| [media] [media] [media]         |
| [media] [media] [media]         |
| 3 selected  Favorite Save ...  | <- only while selecting
| Home Library Places Uploads More|
| safe area                      |
+--------------------------------+

Desktop places: sidebar | map workspace | selected place/list pane
Mobile places: header + section tabs | map OR list | bottom nav
Selected place: nonmodal summary, then accessible detail sheet on request
```

On narrow screens, secondary section overflow is labeled and keyboard-accessible. Never squeeze Trash or History into an unlabeled icon with no discoverable name. The bottom nav is navigation; selection actions form a separate toolbar.

### Actions and icon vocabulary

Keep a single named action vocabulary shared by pages, menus and toolbars. Reuse local icon geometry; standard actions are static by default. Add a missing conventional glyph locally only when necessary.

| Meaning | Glyph / label |
| --- | --- |
| Home / Library / Places / Uploads | House / library or image / map pin / upward upload arrow, with visible nav labels |
| Create album/place | Plus, “Create album” / “Add place” |
| Select / cancel selection | Checkbox/check-square / X, “Select” / “Cancel selection” |
| Favorite | Heart, toggled state and “Add to favorites” / “Remove from favorites” |
| Save to album | Bookmark or folder-plus, “Save to album” |
| Remove from album | Folder-minus or explicit text, never an ambiguous permanent-delete label |
| Edit / settings / more | Pencil / sliders or gear / horizontal ellipsis |
| Move to trash | Trash, “Move to trash” |
| Restore | Counterclockwise restore arrow, “Restore” |
| Permanently delete | Trash plus explicit menu/dialog text, “Permanently delete” |
| Retry / pause / resume | Circular retry / pause bars / play triangle |
| Copy / close / back | Copy squares / X / left arrow |
| Check in / directions | Calendar-check / navigation arrow |
| Users / approve / disable / role | Users / check / ban / shield; role changes require a label |

Do not use a paperclip to mean upload submission, a plane to mean general navigation, or a bot to mean a human administrator. Preserve a paperclip only for attaching/selecting files. Icon-only row actions require localized `aria-label`, tooltip/title, and a 44px touch hit area. Toolbars use visible labels for primary/destructive actions where possible. Overflow menus retain the exact same handlers and permission checks.

## 6. Motion reduction contract

The goal is immediate feedback and continuity, not choreography. Do not install another animation library or run an animation CLI. Existing Motion/Animate UI dependencies may remain until their functional primitives have verified replacements.

| Surface | Target behavior |
| --- | --- |
| Route changes | Immediate by default. Optional single 120ms opacity entrance on the new content only |
| Gallery/Places section switches | Immediate; no nested page transition |
| Filters, sorting, pagination, refetch | No route transition; preserve dimensions and current content where valid |
| Action bars | Immediate item changes, stable height; no width/height tween or inferred animation key |
| Buttons/nav icons | Static state changes; no hover bounce, rotation, particle burst or per-item entrance |
| Dialog/menu open | At most 120ms opacity; optional small 4px translation for a sheet, never scale text |
| Dialog/menu close | Immediate or at most 80ms; cleanup must also work with zero duration |
| Toasts | Short opacity entrance; no page reflow; status remains perceivable without motion |
| Loading | Static skeletons; genuine indeterminate spinner only while pending; static busy text when motion disabled |
| Progress | Numeric/text state always available; no animated count-up |
| Viewer carousel | Direct manipulation/swipe remains; disable decorative slide effects and particles |
| Map | Keep direct panning/zoom/navigation; automatic camera moves obey reduced motion |

Settings becomes “Interface motion” with `Off` and `Subtle`; default Off. Off means zero optional motion, not a fallback fade. OS `prefers-reduced-motion: reduce` always wins. A user cannot accidentally re-enable animation against the OS preference. Keep sounds/toasts/notifications as independent existing settings.

Migration rules:

1. Read the old animation keys once. Old `animations-enabled=false` maps to Off. Old effect names may map to Subtle, but unknown/missing values map to Off.
2. Remove the ten-effect selector, click-effect selector, theme transition and decorative global Click overlay. Retire the separate animated-icon preference only after all consumers become static or use the unified motion policy.
3. Preserve old preference keys during the rollout for rollback; they no longer control the new renderer. Do not clear unrelated localStorage.
4. Audit imports of `PageTransition`, `usePageTransitionLoading`, `mediaViewerTransition`, `fullPageTransition`, and `readPageTransitionEffect`. Loading/error/focus behavior must survive removal of the animation wrapper.
5. Keep resource runtimes outside route animation boundaries. Do not key the authenticated shell by pathname.
6. Do not wait for exit animations before navigation, fetching, accepting input, or restoring focus. Avoid `flushSync`, global `document.getAnimations()` cancellation and layout measurement for decorative effects.

Transform/opacity are the only optional animated properties. No width, height, top/left, blur, clip-path bands, layout springs or `transition: all`. Batch necessary layout reads before writes. See [web.dev layout guidance](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing).

## 7. Frontend performance implementation

### 7.1 Bundle and startup

First fix the confirmed eager Settings import in `AuthLayout`. Use a lazy dialog body mounted only when open, with a reserved-size loading state and error recovery. Keep pre-login preferences available. Lazy-load Home if its transitive dependencies materially inflate the public entry. Keep maps and navigation SDK code outside login, gallery and ordinary account routes.

Audit shared UI barrels for runtime re-exports that pull unrelated features into startup. Use narrow imports where the built graph proves a leak. Keep locale tables and auth primitives simple; do not split every tiny component into a network request. Keep avatar editor and full media viewer out of routes that only show a thumbnail/avatar.

`services/sounds.ts` already dynamically imports `react-sounds`; do not claim it is necessarily eager. Check `SoundEffectsSettings` and other imports before changing it. Preserve sound preferences and failure isolation. Audit both `howler` and `react-sounds` usage before removing either package.

Do not upgrade React, install React Compiler, replace Mapbox, or swap all primitive libraries as a shortcut. Remove packages only after zero runtime references and verified behavior replacement. Compare gzip sizes and actual dependency paths; more chunks do not automatically mean fewer downloaded bytes.

### 7.2 Render ownership

- Query remains server state; Zustand remains shared client preferences/session; local state owns input, open menus and selection UI.
- Subscribe to the smallest stable Zustand selector. Do not subscribe a grid to the whole auth/preferences store.
- Memoize derived media grouping/feed merging by actual data and locale. Avoid allocating new arrays for unrelated notification or progress updates.
- Memoize expensive leaf rows only after establishing stable item props/callbacks. Do not add `memo` everywhere or deep-equality comparisons.
- Keep selection as stable IDs plus only the snapshots needed by existing offscreen/bulk actions. Do not lose selections when a row unmounts.
- Isolate upload progress to affected rows and the compact summary. Progress must not repaint the gallery or recreate map instances.
- Use Query's structural sharing and `select` where appropriate; subscribe only to properties used. Avoid object-rest destructuring query results into broad subscriptions. See [TanStack render optimization guidance](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations).
- Preserve stable keys: media ID, album ID, batch/item ID, user ID. Never key ordinary content by locale, random ID or animation choice.
- Use React Profiler evidence to justify memoization; measure production-like builds, not StrictMode development counts alone. See [React Profiler](https://react.dev/reference/react/Profiler).

### 7.3 Action bar without registration churn

Keep the public `PageActionBar` call sites initially. Replace stored React-node registration with a stable DOM target exposed through context and `createPortal`, or use direct composition for pages that need no shared slot. Provider owns only the slot target; child render updates must not set provider state through `useLayoutEffect`.

Move bar CSS from `pages/gallery/gallery.css` to a shared layout stylesheet. Keep the mobile slot above bottom navigation and desktop slot in the page task area. Hidden file inputs remain in their owning feature. Preserve action order, accessible names, focus and busy state. Do not infer identity from `function.name` or array index. At route changes there must be no stale action handlers from the previous page.

### 7.4 Bounded media DOM

Replace wrapper-per-item windowing with row virtualization for Gallery, Favorites, Trash and album media. Prefer a maintained small virtualizer if it proves smaller and safer than a custom implementation; record dependency cost before adding it. Reuse one grid/windowing implementation across these surfaces.

Implementation contract:

1. Flatten date headers and media rows into stable virtual items. Each media row knows its columns and fixed aspect-ratio height. Date headings have measured stable heights.
2. Derive column count from container width; observe the container once. Use the actual scrolling element as the virtualizer root.
3. Render visible rows plus three overscan rows above/below, top/bottom spacers, and the focused row if it would otherwise unmount. Do not keep one empty wrapper per historical image.
4. Use stable media IDs for selection and viewer navigation. Keep focus/scroll restoration by item ID plus within-row offset.
5. Preserve date grouping, keyboard selection, long press and desktop drag selection. Geometry for drag selection comes from known row/column layout; do not scan every accumulated DOM node per pointer move.
6. One next-page request at a time. Cancel obsolete filter requests; retain loaded data as needed for backward navigation. Do not introduce arbitrary query eviction that breaks viewer previous/next or return-to-grid behavior.
7. Expose an accessible Load more fallback and meaningful row/item position information. A screen reader must be able to reach all items without pointer scrolling.
8. Opening a viewer does not fetch every original. Load active media plus at most adjacent candidates. Stop/release offscreen video, revoke object URLs and disconnect observers on teardown.

For variable-height Home feed/history, use pagination first. Introduce measured-height virtualization only if profiling shows a problem and focus/caption expansion remain correct. `content-visibility` alone is not a bounded-DOM solution.

### 7.5 Network and realtime ownership

Add viewer identity to viewer-specific query keys, or prove complete cache clearing on identity change, including in-flight responses. Keep existing account-race guards. Never show previous user's data as placeholder content.

Propagate Query cancellation signals through feature services into `api` where supported. Coalesce duplicate requests; narrowly update successful mutation data and invalidate affected scopes. Do not blanket-disable refetching or hide stale failures to win timing measurements.

Consolidate `UsersPage` and `PresenceRuntime` connections into one authenticated realtime owner with explicit subscribers. Preserve every current event: `UserPresenceChanged`, `UsersChanged`, `PublicAlbumPublished`, `UploadCompleted`, `AlbumChanged`, `MediaChanged`, `AccountChanged`, `PlacesChanged`, `PlaceCheckedIn`, and `SessionChanged`. Recheck the hub before implementation for additions.

Token refresh must use the current token factory; locale changes must update displayed text without dropping upload work. Logout/account switch stops old subscriptions and ignores late events. Reconnect must reconcile missed state; keep a bounded fallback poll if required. Reduce polling only after proving event coverage. Do not add a second global store containing duplicate server data.

Replace whole-page periodic clocks with leaf timestamps or the next relevant deadline. Visit removal deadlines must still be rechecked at click time and enforced server-side. Do not change five-minute/24-hour business rules to reduce renders.

## 8. Backend support: compatible, bounded changes

Visual refresh needs no schema migration. Backend changes exist to remove confirmed request amplification and unbounded data transfer. Keep current controllers -> application contracts -> repositories/adapters. Do not introduce CQRS infrastructure, MediatR, Redis, or a new storage system for this task.

All routes below marked **proposed** are new designs, not claims about existing endpoints. Read current DTOs/service contracts first. Introduce additive methods and endpoints; old arrays and aliases remain compatible. No changes in restricted directories.

### B01 — Batch owned-album membership (required)

Current issue: selecting 50 gallery items can create 50 album-list queries.

Proposed `POST /api/library/album/membership/query`:

```json
Request:  { "mediaIds": ["<guid>"] }
Response: { "items": [{ "mediaId": "<guid>", "albumIds": ["<guid>"] }] }
```

- Authenticated; use caller-owned albums only, matching current `list("mine", mediaId)` semantics.
- Accept 1–100 distinct IDs per request; validate GUIDs and cap before constructing SQL. Client chunks larger selections into groups of 100 with bounded concurrency, never N requests for N items.
- Query active membership and active media in a set-based repository projection. Return no unrelated private album metadata. Existing inaccessible/absent IDs produce no membership, without existence disclosure.
- Client uses canonical sorted IDs and viewer ID in the query key. Start after selection settles or when actions need membership; show pending state rather than pretending none are in albums.
- Preserve exact save/remove behavior and partial-failure handling. Invalidate membership after membership mutations, album deletion and relevant media deletion.
- Target: one request for 1–100 selected items and a bounded query count independent of item count.
- Files: `CollectionsController.cs`, `Services/Interfaces/ICollectionService.cs`, new request/response models, `CollectionService.cs`, `ICollectionRepository.cs`, `CollectionRepository.cs`, `albumService.ts`, gallery selection consumers and album dialogs.

### B02 — Paged album/feed/chooser reads (required for bounded scale)

Proposed additive `GET /api/library/album/page?scope=mine|public|all&limit=30&cursor=...` returns `{ items, nextCursor, hasMore }`. Existing `GET /api/library/album` remains an array. Validate `all` as admin-only. Reuse current viewer-specific favorite batching and cover semantics.

Use deterministic `(CreatedAt DESC, Id DESC)` ordering and an opaque validated cursor containing both values. Cap limit at 100. Do not change existing media offset paging in the same slice. Preserve exact totals only where the UI currently needs them; compute a separate scoped count if necessary. Do not label loaded count as total.

Home must merge owned/public pages consistently or use a dedicated server-side feed query that preserves current visibility and ordering. Do not fetch all pages eagerly to imitate the old arrays. Album chooser can page/search owned albums while retaining the selected album even outside the current page.

### B03 — Bounded map data (required for large libraries)

Current `useLocations` eagerly walks every image page; existing `/api/location/place/map` is already a lightweight shape but is unbounded. Reuse these concepts rather than loading full media objects for every marker.

Proposed additive photo map endpoint: `GET /api/location/travel/map?west=...&south=...&east=...&north=...&zoom=...&cursor=...&limit=200`.

- Return marker IDs, coordinates, display metadata and preview identifiers, not binary images/full original metadata. Fetch selected-media detail through an appropriate existing/new authorized detail contract.
- Validate coordinate/zoom bounds, finite numbers and maximum page size. Handle antimeridian bounds explicitly; do not silently treat `west > east` as no results.
- Query after `moveend` with 150–250ms debounce and abort the obsolete request. Do not send a request every animation frame.
- A dense viewport must use honest clusters/counts or continuation; never silently drop markers at a cap. Cluster expansion must lead to all permitted items.
- Preserve unlocated-photo listing, location scans and shared-home actions through their own paged paths. A spatial filter must not make unlocated content disappear from the product.
- Add the same optional bounded map contract for places; keep saved-list and history independent.
- DOM marker projection/grouping should update once per scheduled map frame or settled movement, not for unrelated UI state. At large scale, prefer map layers/clustering plus a small selected-marker DOM overlay; retain accessible list equivalents.
- No spatial schema/index migration without query-plan evidence from a separately authorized environment. Existing JSON coordinates may require a later measured migration; do not promise indexed spatial performance from the current schema.

### B04 — Users, places and visit history paging (required for bounded scale)

Add explicit `/page` endpoints rather than changing array response shapes. Users retain their current directory/admin visibility; places and visits retain owner/history permissions. Support server filtering before paging, stable tie-breakers, cancellation and limits. Preserve exact totals for the existing numbered Users pagination. Keep existing history time/rating/note behavior.

Current `PlaceRepository.WithAverageRating` uses a batched aggregation, not a proven N+1. Profile before changing it; restrict aggregation to the page or project it in SQL when appropriate. Preserve rounding and rating semantics.

### B05 — Preview/streaming and upload review (conditional)

Review generated preview cache locking/concurrency, MIME/range behavior, cancellation and failure cleanup only if timing/trace evidence points there. Existing previews are bounded at 640x640 and have privacy-sensitive cache behavior. Do not casually change `no-store`, token transport or access checks.

Prefer the existing preview URL for grids and originals for viewing/copying. A smaller thumbnail variant is optional only after measured payload savings justify API/cache changes. Keep original image/video content unchanged. Preserve upload batching, progress and completion transactions; throttle UI updates independently of durable server state.

### Backend review checklist per change

Verify authorization and viewer scoping; validation/caps; deterministic order; cancellation; `AsNoTracking` on read-only queries; SQL projection before materialization; bounded query count; no accidental global filter bypass; compatibility aliases; error shape; cleanup/rollback; and frontend type agreement. Build the solution. Do not claim runtime query speed, API correctness or database plans were tested under the current validation restriction. [EF Core efficient-querying guidance](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying) informs projection and pagination choices, not a blanket repository rewrite.

## 9. Screen-specific implementation notes

### Home and albums

Let media and album titles dominate. Keep caption disclosure, favorite/bookmark distinction and ownership controls. Avoid turning Home into a metrics dashboard. Preserve preview-only covers' restrictions on favorite/save actions. Do not make every card have identical fixed text height that clips captions. On desktop, details can sit beside the image; on mobile, owner/date/title precede it and controls follow it.

Album detail gets one compact information header. Owner settings and broader caption editing have separate controls. Display privacy as text plus an icon. Deleting an album must explain that library media remain. Removing media from an album must not look like permanently deleting files.

### Gallery, selection and viewer

Use aspect-ratio-reserved tiles and date headers. Keep selection mode explicit, selected count visible and Cancel reachable. Long press and double-click are shortcuts, never the only way to select/favorite. Preserve focus when closing a viewer to an item that has been virtualized; scroll it into the window, then focus it. If deleted, choose the nearest surviving item and announce the change.

Use one shared viewer for Gallery/Favorites/Albums/Trash, with permission-specific actions. It must not render every original image/video. Preserve keyboard previous/next, touch swipe, clipboard feedback, supported video controls, download behavior if present in the current implementation, map links and retry. Do not add new download histories because an old guide mentions them.

### Uploads

Display actionable states: queued, uploading, paused, failed and completed. Progress includes text and counts. Keep active work above history, date filtering and page-size controls. Expanding a batch should not remount/restart the upload runtime. Missing-file retry explicitly requests the original matching file. Removing a record and deleting media remain separate operations. Unread indicators need readable labels, not red/green dots.

### Places, travel and history

Avoid a map covered by independently floating controls. Group search/navigation tools and map appearance controls into two consistent zones. Keep attribution visible. Loading/error overlays must not cover recovery controls or trap keyboard focus. Show a list alternative if map loading or location permission fails.

Place detail presents name, address, rating, notes, photos, Check in and Directions in that order. Ownership actions are secondary. Desktop may show all information beside the map; mobile uses a summary and detail sheet. Preserve photo draft cleanup and the current 12-image place limit. Keep rating zero as unrated, not one star.

Home-marker drag/hold actions need explicit menu/keyboard alternatives. Retain move/removal confirmations and cancellation that releases pending gestures. Existing 600ms home hold semantics must not accidentally execute while scrolling. Preserve history details after a place is soft-deleted and current visit edit/removal eligibility.

### Users, profile, settings and authentication

Users table separates identity, role, state, last activity and actions. Presence is text plus a shape, never only a colored dot. Do not expose admin actions to members. Role changes/disable/delete keep current self-protection rules and confirmation flows.

Profile keeps avatar configuration and password changes. Settings uses grouped rows for experience, notifications and device permissions. Replace fake permission-off toggles with honest current status plus “Open device settings” guidance where the app cannot revoke permission. Preserve notification limitations: no promise of closed-app push if unavailable.

Auth pages retain password managers, autocomplete, paste and validation. Remove the global touch context-menu suppression unless a particular drag surface truly requires it; scope gesture prevention narrowly. Do not prevent copying text, using native media controls, or accessing browser accessibility behavior throughout the app.

## 10. Execution sequence for the implementation agent

Implement one numbered slice at a time. Each slice must have a focused diff, its stated checks, and a short completion record. Do not combine a broad architecture rewrite with the visual changes. New paths below are suggested only when they replace repeated behavior; reuse an existing owner when possible.

| Slice | Dependencies | Concrete work and likely files | Completion gate |
| --- | --- | --- | --- |
| P00 — Freeze inventory | None | Record current dirty tree; map routes/actions/permissions from current source; baseline build/typecheck/tests; create implementation checklist | Every section-3 row has an owner and baseline; existing failures distinguished from regressions |
| P01 — Tokens and one theme | P00 | `global.css`, all feature CSS, `index.html`, `ThemeContext`, `ThemeTogglerButton`, UI exports, `AuthLayout`, `Sidebar`, manifest/launch colors | No theme control or dark startup flash path; five-color audit passes; old theme storage ignored safely |
| P02 — Shared primitives | P01 | Button/Input/PasswordInput/Status/Tooltip/DatePicker/Pagination/Toast/ConfirmationDialog/CustomDialog; typography/focus/icon sizes | All component states readable; zero-duration close and focus work; no mandatory shadow |
| P03 — Motion simplification | P02 | `PageTransition`, `utils/pageTransition`, animation/click stores, Settings, App Click provider, icon wrappers, viewer transition helpers | Off is zero optional motion; no nested route effects, particles, width animation or stale loading dependency |
| P04 — Adaptive shell | P02, P03 | `AuthenticatedLayout`, `Sidebar`, proposed `BottomNavigation` and shared nav definition, `sidebar.css`, shared action bar CSS/portal | Left sidebar/rail and five-item mobile bottom nav; no duplicate runtime or overlapping action/nav bars |
| P05 — Startup splitting | P03, P04 | `AuthLayout`, `App`, narrow imports, lazy settings/avatar/viewer; inspect Vite chunks | Settings warning removed; maps absent from non-map startup graph; build budget recorded |
| P06 — Batch membership | P00 | Backend B01 plus album service/types/query keys and Gallery selection | At most one membership request per 100 IDs; correct loading/errors and ownership; BE build and FE tests |
| P07 — Media browsing | P02–P06 | Shared virtual grid, `useGalleryWindow`, Gallery/Favorites/Trash/AlbumPage, MediaTile/viewer, selection hooks | Bounded tile DOM, stable selection/focus, preserved bulk/trash/viewer actions |
| P08 — Album/feed paging and design | P07 | Backend B02, `useAlbums`, album chooser/forms/cards/feed/Home, preview picker | No eager all-page feed; cover drafts and all permission distinctions preserved |
| P09 — Uploads and notifications | P04, P05 | UploadManagementPage/BatchCard/runtime display, NotificationBell, toasts, sounds | Uploads survive navigation; all retry/pause/read flows work; progress isolated |
| P10 — Places and travel | P02–P05 | Backend B03/B04 places/history, map hooks, LocationMap/PlaceMap, PlacePage, editors/search/directions/camera | Bounded map reads; marker/list parity; permissions, drafts, home and visit rules preserved |
| P11 — People/account and realtime | P04, P05, P09 | Backend B04 users; UsersPage/Profile/Settings; shared event owner replacing duplicate connections | Directory and admin actions remain; locale/token changes do not duplicate connections or interrupt uploads |
| P12 — Bundle/data polish | P07–P11 | Remove genuinely unused effects/dependencies/CSS; inspect barrels; conditional B05 only if evidenced | No dead theme/motion code; startup budgets improved without lost behavior |
| P13 — Platform, integration and docs | All | Manifest/index/worker/Capacitor review, final build/typecheck/FE suite, route/state/palette audits, guide updates | Checklist complete; unresolved manual/runtime evidence explicitly listed; rollback remains possible |

After P01/P04/P03, update both mirrored FE overview skills to remove obsolete two-theme hover values, off-canvas-only mobile guidance and animation defaults. These rules remain current until implementation lands; this plan does not prematurely rewrite them. Update project-info pages and stale overview links as part of P13, using actual paths. Preserve all validation restrictions.

### Suggested frontend test ownership

- Shell/nav/action bar: existing `AuthenticatedLayout.test.tsx`, `Sidebar.test.tsx`, `PageActionBar.test.tsx`; add bottom-nav interaction coverage.
- Motion and components: `ThemeTogglerButton.test.tsx` should be retired/replaced with single-theme migration assertions; keep tests for `CustomDialog`, Toast, Pagination, DatePicker, Status and icon behavior that remains.
- Media: Gallery/Trash/MediaTile/MediaPreviewDialog/PhotoPicker tests; add virtual-grid selection and focus restoration cases using deterministic mocked geometry, not browser automation.
- Albums: AlbumFormDialog and preview draft tests; include owner/public/admin distinctions and preview lifecycle behavior.
- Uploads: UploadManagementPage, UploadBatchCard, uploadRuntime, uploadService and unread behavior.
- Maps: existing location search, marker, home, places, editor, navigation and history tests; preserve camera cleanup and permission failures.
- Account: UsersPage, ProfilePage, authStore and session behavior; add shared realtime cleanup/reconnect tests with mocked hub events.
- CSS/palette: update `global.test.ts` to the new contract; tests must protect behavior/tokens, not assert arbitrary snapshots of every class.

## 11. Acceptance gates and measurement protocol

### Immediate code/build gates

From `Frontend/`:

```powershell
npm.cmd run build
npx.cmd --no-install tsc --noEmit
npm.cmd test -- --run <relevant-existing-test-file>
# At final integration, once focused slices pass:
npm.cmd test -- --run
```

Use the installed TypeScript binary; do not fetch a new compiler when unavailable. Record baseline type errors before touching code. From repo root, run `dotnet build Backend\ShinigaCim.sln` after backend changes. No backend tests, backend startup, API smoke checks, or e2e runs.

### Design and behavior gates

- Every feature inventory row has an implemented destination and preserved action; all route aliases still resolve.
- Same authorized operations remain on compact screens. Desktop-only conveniences have a mobile alternative.
- Only five authored UI colors; content exceptions documented. Search CSS, TSX inline styles, SVG assets, Tailwind arbitrary values, manifest, HTML and native launch resources. Review findings rather than blindly replacing data colors.
- No app theme toggler, dark root class, theme-switch view transition or legacy startup script remains.
- Text/controls/focus use approved contrast pairs; peach never backs normal brown labels. Critical status is not color-only.
- One page heading, useful landmarks, labeled navigation/controls, visible focus, dialog trap/return, Escape and native Back behavior. No focused element hidden behind bottom bars.
- All async surfaces have initial loading, refresh, empty, error, partial failure, disabled and retry behavior. Toast-off preference cannot hide essential inline errors.
- English and Vietnamese remain complete; no untranslated new labels, clipped buttons or incorrectly reformatted dates/counts.
- Reduced motion and Off avoid optional animations, including third-party primitives and automatic map camera effects.
- Session/account switch cannot show cached prior-user favorites/history or leave old realtime events active.
- No service-worker caching of `/api`, `/hubs`, credentials, protected media or upload blobs. Split chunks used offline must be available or fail gracefully with an honest online-required state.

### Performance targets

Targets are acceptance objectives, not measured improvements. Freeze the comparison environment and inventory before using percentage claims.

| Metric | Target / pass condition |
| --- | --- |
| Initial JS | Entry + complete eager dependency graph <=250 kB gzip; aim for >=25% reduction from a recomputed complete baseline, not merely the 332.41 kB lower bound |
| Public auth JS | Stretch target <=180 kB gzip; no settings body, map SDK or avatar editor until requested |
| Entry CSS | <=20 kB gzip; no map CSS in auth/gallery startup |
| Lazy map dependency | Remains on-demand; report its cost separately, do not disguise it with chunk naming |
| Gallery DOM | Tile wrappers bounded by visible rows plus six overscan rows and a focused row; count does not grow with 1,000 loaded items |
| Selection renders | Toggling one tile updates that tile and relevant selection summary; unchanged tile content does not rerender due solely to selection |
| Membership traffic | One request for 1–100 IDs; bounded chunking above that; no per-item album-list storm |
| Scroll handlers | No full-gallery `querySelectorAll`/rectangle scan per scroll; no alternating layout read/write loop |
| Realtime | One authenticated connection per tab; no extra UsersPage connection; no reconnection solely for locale changes |
| Startup data | No automatic fetch-all loop for maps/feed; visible data and selected detail bounded |
| Field experience | At p75, LCP <=2.5s, INP <=200ms, CLS <=0.1; requires later real/browser measurement |
| Interaction traces | No newly introduced >50ms main-thread task from selection/menu/motion logic; compare on the same device/data |
| Backend read paths | Query count bounded with page/batch size; no per-row round trips; runtime latency claim deferred until authorized evidence exists |

If a budget cannot be met without behavior loss, document the measured bottleneck and a specific follow-up. Do not remove a feature, lie about total counts, weaken permissions or arbitrarily evict data to pass.

### Later manual/runtime review, not executed or authorized by this plan

Use user-provided captures, an explicitly authorized browser session, or user-run checks. This project currently forbids unsolicited browser-driven tests. Do not claim visual/accessibility/performance completion from a build alone.

Review 360x800, 390x844, 768x1024, 1024x768 and 1440x900; include landscape, safe areas, virtual keyboard and 200% zoom. Exercise empty data, 100/1,000 media items, long captions/names, many albums/places/users, slow/failing network, permission denial, reduced motion, and member/admin accounts. Do not seed or mutate a database without authorization.

Capture identical before/after journeys: cold login, authenticated Home, Gallery scrolling/selection, viewer open/close, map navigation, upload progress while changing routes, and Users presence updates. Record device/browser versions, CPU/network settings, cache/service-worker state, data sizes, five repeated runs and median/range. Use field p75 separately from synthetic medians. Collect render commits, long tasks, DOM count, bytes and request counts; do not infer these from bundle size.

## 12. Rollout and rollback

Keep each slice reviewable and independently reversible. Deploy compatible backend read endpoints before enabling frontend consumers. Old endpoints remain during the rollout. Do not require a database migration for theme/layout changes. Any later measured schema/index change gets its own reversible plan.

Preserve old preference values until the new UI is stable, but never let them re-enable dark mode or removed effects. Do not wipe IndexedDB upload files, session state, notification read state, avatar choices or map preferences during migration.

Version the service-worker shell cache when asset strategy changes. Avoid deleting assets needed by an open tab midway through a deployment. Retain the previous build's hashed assets for a deployment overlap or provide a safe reload recovery path. Do not force a reload during active uploads. Test offline expectations only through a later permitted check.

If a new feature slice fails, revert that slice or disable its new client consumer while preserving existing endpoints and data. Rollback must not undo unrelated pre-existing working-tree changes. Keep the new five-color design coherent during rollout; do not leave half of the app dark and half light.

## 13. Handoff prompt

Use this prompt for the implementing model:

> Implement `Instructions/ui-overhaul-plan.md` in dependency order. Start with P00 and reread current source, AGENTS.md, and both stack overview skills. Preserve existing dirty files and all feature/permission/deep-link behavior. The five-color palette applies to app UI; media, avatars, maps and user-authored marker content retain their colors. Build one warm theme, left desktop navigation, mobile bottom navigation, and minimal motion. Follow the feature inventory and measurable gates. Do not run backend tests/startup/API checks or browser-driven tests. Complete one reviewable slice at a time, run permitted checks, and record evidence and remaining gaps. Do not substitute a framework rewrite, dummy data, deleted features or silent authorization changes. Treat runtime performance and visual quality as unverified until permitted evidence exists.

## 14. Research and planning record

Primary references used for the plan: W3C contrast/non-text/target guidance, React Profiler, TanStack Query render guidance, web.dev layout guidance, Android adaptive navigation, and EF Core efficient querying. These inform the design; this plan's pixel dimensions, palette roles, route grouping and budgets are project-specific decisions, not claims that a source mandates them.

The chosen 44–48px touch targets exceed the WCAG 2.2 AA minimum; see [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). App/browser forced-colors accessibility preferences take precedence over the authored palette.

The local UI/UX design database script was located but could not run: `python` was unavailable, and `python3`/`py` were not found. No database-generated design result is claimed. Design direction instead uses the supplied palette, source audit, skill defaults and the primary references linked above.

Planning validation completed: source inventory, production FE build, ten palette-pair calculations, and mirrored border-rule update. Not completed: rendered inspection, frontend tests/typecheck, backend build/tests/runtime checks, browser performance measurement or database profiling. Those are either implementation gates or restricted checks, not implied successes.
