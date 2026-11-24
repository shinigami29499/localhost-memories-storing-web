---
name: mobile-page-loading-overlay
description: Show a route-component loading indicator while the router resolves mobile page code.
---

`MobilePageLoadingOverlay.tsx` shows a localized progress bar while the router resolves the destination. It counts cached or fetched static assets and the resolved route module. The menu highlights the pending destination as soon as loading starts. Header controls and tabs stay usable. A new navigation aborts the previous asset fetches and prevents the abandoned page from mounting. API queries and map readiness use in-page placeholders.

The authenticated overlay centers the icon, title, and meter between the top of the viewport and the top of the floating menu bar. Public overlays use the full viewport. The meter uses a darker track in the light theme. `tests/e2e/mobile-app-accessibility.spec.ts` checks alignment and holds the route module and album response independently to verify that the album request starts during the transition.

Navigation between the Album list and album detail skips the route overlay in both directions. The current page stays visible until the destination route is ready.

The progress bar fills in one-percent steps over 500 ms and stays below 100% until the destination is ready and the fill time has elapsed. If the localized title changes, the shell hides its previous title and Home identity. At 100%, the overlay fades over 400 ms. A new title slides into the committed header during that interval. When the title text matches, the same header node stays visible and its gradient keeps running. The overlay uses a generic loading label for that transition. Interface motion does not control the fill, fade, or slide. System reduced motion skips these animations.
