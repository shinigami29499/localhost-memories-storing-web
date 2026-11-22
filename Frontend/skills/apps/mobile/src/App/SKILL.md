---
name: mobile-app
description: "Mobile routing and runtime."
---

# Mobile routing and runtime

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

App.tsx provides locale, query, motion, toast and routing. Protected routes require an access token; trash requires admin or superadmin. On Android, native Back from an authenticated page uses the same return-to-Home action as the in-app Back button. Native Back on the authentication routes uses history. Legacy paths redirect to current routes. Queries retry once except status 0; stale time is 15 seconds and focus refetch is disabled.

The entry point prepares UI resources and registered modules before the router starts. Android bundles the built assets. On first preparation, Open app starts Home for a signed-in session and posts a welcome toast. Signed-out visitors open Sign in. The prepared initial route skips the route overlay. API queries start on mount and render local placeholders.

The User directory uses `/user`, `/user/pending`, and `/user/blocked`. Legacy `/users` paths and `/admin/users` replace the current history entry and preserve query strings, fragments, and navigation state.
