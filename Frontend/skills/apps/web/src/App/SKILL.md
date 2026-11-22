---
name: web-app
description: Browser routing, UI resource loading, and startup.
---

The web entry point prepares public UI resources before starting the production router. The shell highlights the pending route and shows component progress. Component loaders resolve before the destination mounts. Page queries render their own loading placeholders. See the shared `ui-resources` skill for cache and cancellation rules.
