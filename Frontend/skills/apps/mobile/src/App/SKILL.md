---
name: mobile-app
description: "Mobile routing and runtime."
---

# Mobile routing and runtime

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

App.tsx provides locale, query, motion, toast and routing. Protected routes require an access token; trash requires admin or superadmin. On Android, native Back from an authenticated page uses the same return-to-Home action as the in-app Back button. Native Back on the authentication routes uses history. Legacy paths redirect to current routes. Queries retry once except status 0; stale time is 15 seconds and focus refetch is disabled.

The router resolves lazy page modules and supplies committed location changes to the mobile loading overlay. The loader appears fully opaque in the same commit as the destination. It remains available with interface motion off. Browser and native history back use the same loading flow when returning from a page opened through it. System reduced motion bypasses the overlay and animated handoff.
