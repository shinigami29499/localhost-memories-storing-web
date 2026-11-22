---
name: ui-resources
description: Cache public UI files and report component loading before page data requests.
---

`uiAssetsPlugin.ts` writes `/ui-assets.json` for the web and mobile builds. It lists public Vite assets and static dependencies for lazy route modules. `UiBootstrap.tsx` prepares the build in Cache Storage and warms registered route and dialog modules before starting the router. Development warms the modules within the current document. Capacitor uses packaged files. The first preparation screen lists package states and offers Open app when all items are ready. Opening starts the Home route for a signed-in session and delivers its welcome toast. Signed-out visitors open Sign in. The prepared initial route skips the second overlay.

Active superadmins can skip first-load preloading in ordinary browser tabs. The preference applies after reload. Standalone PWA launches and native builds ignore it. The cache accepts public build files only. API responses, hubs, protected media, and authenticated requests stay outside it.

`uiRoute.tsx` prepares route files using the React Router navigation request signal. The progress bar counts completed cached or fetched assets and the resolved route module. When shown, the overlay stays visible for at least 250 ms, including on cached pages and sign-in and registration. Returns from inner pages to main tabs skip the overlay and minimum wait. Query and dialog changes on the same path skip the delay. Switching routes cancels the wait and outstanding asset fetches, and prevents the old page from mounting. A JavaScript import already started by the browser can finish and be reused. Page queries start on mount and render local placeholders.
