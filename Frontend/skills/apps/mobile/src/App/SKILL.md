---
name: mobile-app
description: "Mobile routing and runtime."
---

# Mobile routing and runtime

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

App.tsx provides locale, query, motion, toast and routing. Protected routes require an access token; trash requires admin or superadmin. Native back uses history or returns home. Legacy paths redirect to current routes. Queries retry once except status 0; stale time is 15 seconds and focus refetch is disabled.
