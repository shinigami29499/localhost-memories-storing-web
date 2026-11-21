---
name: mobile-page-loading-overlay
description: Track initial page readiness during mobile navigation and move its title into the destination header.
---

`MobilePageLoadingOverlay.tsx` receives the destination title, icon, and shell content reference. Navigation starts collecting query observers before the router commits, independently of Interface motion. Progress counts one render unit and each distinct active TanStack Query that gains a destination observer. Initial data, terminal errors, and paused work settle a query unit. Lazy content and the map report render readiness through `data-mobile-page-pending`. Background refreshes with usable data settle immediately. Deferred media and map tiles continue loading through the destination's own UI.

The overlay paints at full opacity as soon as the destination commits. The bar advances in whole percentage points toward the settled share of work. It uses elapsed time so the 0–100% fill takes about 300 ms when work is ready, independent of display refresh rate. It pauses while awaiting more work and keeps its current value when late requests expand the total. The overlay remains fully visible for at least 300 ms. After initial work settles and the bar reaches 100%, the overlay clears. The interface motion setting determines whether it clears immediately or through a backdrop fade and a title move into the header. Navigation and system reduced-motion changes clean up the overlay's listeners, timers, and animations. System reduced motion bypasses the overlay.

Validate with `tests/e2e/mobile-app-accessibility.spec.ts` using a held Gallery response to check progress and completion in both themes and with Interface motion off.

The title scales to the destination header font size during the slide. Translation and scaling share the same timing and easing. The title aligns its left edge and vertical center with the header before the live title appears.

The overlay covers routed content and leaves the persistent header controls and tabs above it. The shell marks covered page content inert. The browser continues to paint the live header and tab bar during navigation.
