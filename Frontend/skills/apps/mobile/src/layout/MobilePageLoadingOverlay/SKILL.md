---
name: mobile-page-loading-overlay
description: Show a route-component loading indicator while the router resolves mobile page code.
---

`MobilePageLoadingOverlay.tsx` shows a localized progress bar while the router resolves the destination. It counts cached or fetched static assets and the resolved route module. The menu highlights the pending destination as soon as loading starts. Header controls and tabs stay usable. A new navigation aborts the previous asset fetches and prevents the abandoned page from mounting. API queries and map readiness use in-page placeholders.

`tests/e2e/mobile-app-accessibility.spec.ts` holds the route module and album response independently and checks that the album request starts after the overlay is removed.

Route progress uses whole percentage points and stays below 100% during component loading. The minimum display time is 300 ms. During navigation the shell hides its previous title and Home identity. The icon and title stay visible until the progress bar reaches 100%, then the overlay fades and the title slides into the committed header. Reduced motion and disabled Interface motion skip the handoff animation. Opening an album from the Album list or returning from an inner page to a main tab skips the overlay. Album list and detail share the mounted header title.
