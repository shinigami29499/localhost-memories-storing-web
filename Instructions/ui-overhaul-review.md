# UI overhaul review — 2026-11-05

Scope: current working tree against `Instructions/ui-overhaul-plan.md`. Review and documentation only; no application code or tests changed. Findings below are grouped by function. “Bug” means current source or test behavior has a concrete failure path. “Missing” means a plan gate lacks implementation or evidence.

## Media detail and map deep links

### Existing bug

- `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs:75-82`: the new `GET /api/library/gallery/{mediaId}` maps a `MediaFile` without setting `OwnerUsername`. Normal gallery and map pages add that field separately. A photo opened by `?mediaId=` or `?focusMediaId=` outside the loaded map page therefore shows “By Unknown” in `Frontend/src/features/locations/components/LocationMap.tsx:349`. Return the same owner summary as the paged reads.

### Item missing

- The new map photo query in `Backend/Infrastructures/Data/Implementations/MediaRepository.cs:108-154` has no database execution or query-plan evidence. The plan explicitly defers that check; current build success does not prove bounded runtime cost on a large library.

## Gallery selection and focus

### Existing bug

- `Frontend/src/pages/gallery/TrashPage.tsx:180-185`: when the viewed item is deleted, focus falls back to `tiles[0]`, the first currently rendered virtual tile. That can be distant from the deleted item, contrary to the plan’s nearest-surviving-item behavior. Pick a surviving neighbor by item index and announce the change.
- `Frontend/src/pages/gallery/GalleryPage.tsx:148-153` and `Frontend/src/pages/albums/AlbumPage.tsx:83-88`: viewer close clears the pending focus ID even when the target tile is absent. A media removal or page refresh during viewing can leave keyboard focus on the closed dialog or document. Keep the request until a surviving tile is focused; use a neighbor when the original is gone.

### Item missing

- `Frontend/src/pages/gallery/VirtualGalleryGroup.tsx:22-48` reads group rectangles during render for every mounted date group. Tile count is bounded, but scroll still rerenders and measures each group. The plan’s 1,000-item DOM and scroll-work targets need a browser trace; no measured result exists.

## Playwright coverage

### Existing bug

- The requested Playwright run reported **22 failed, 0 passed** and hung during shutdown; it was interrupted after all failures appeared. `Frontend/e2e/section-transitions.spec.ts:11-17` and `Frontend/e2e/transition-diagnostic.spec.ts:10-16` return `[]` for unhandled API routes. Current paged location routes require `{ items, page/offset, total, ... }`; the mocks cause `undefined` property errors. Album mocks also need paged responses. Update fixtures to match the current API contract, then rerun.
- `Frontend/e2e/action-bar-transitions.spec.ts:18` and other transition specs still target `.page-transition`, which the overhaul removed. Update assertions to current navigation and action-bar behavior.

### Item missing

- This Playwright run cannot validate rendered layout, focus, or performance until fixtures and selectors are repaired. Failure contexts and traces were written under `Frontend/test-results/`.

## PWA and launch assets

### Item missing

- `Frontend/public/pwa-icon-180.png`, `pwa-icon-192.png`, and `pwa-icon-512.png` retain the old colors. `Frontend/public/pwa-icon.svg` and `manifest.webmanifest` use the new palette. Regenerate and inspect the PNG install icons.
- `Frontend/public/service-worker.js:8-18` precaches HTML-referenced assets only. Route-level lazy chunks are fetched into cache only after a route is visited (`:65-78`). Verify a first offline launch and reload of each required shell route; document an online-required fallback where a chunk is absent.

## Integration gates and plan status

### Item missing

- Complete route, permission, English/Vietnamese, responsive, reduced-motion, and assistive-technology checks from plan section 11 are not evidenced. Treat these as open verification gates, not proven defects.
- Plan section 11 performance targets lack a frozen before/after environment, browser traces, field data, and database plans. The production frontend build and TypeScript check passed in this review; `dotnet build Backend\ShinigaCim.sln -c Release --no-restore -v:q` passed with zero warnings/errors. The Debug build failed only because another process held `Backend/Apis/bin/Debug/net8.0` DLLs.
- The plan-file compression is **blocked**. Python was installed temporarily and the prescribed script was attempted. Automatic approval review rejected provider-connected runs because they would transmit the full internal plan to Anthropic/Claude. `Instructions/ui-overhaul-plan.md` remains untouched; no compressed result or readable backup was produced. Compression needs explicit approval for that disclosure.
