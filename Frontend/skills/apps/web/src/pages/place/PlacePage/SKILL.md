---
name: web-place-page
description: Place browsing and visit history.
---

Saved places and visit history show row placeholders during their initial queries.

The map panel owns a delayed overlay across module import and renderer initialization. The renderer reports readiness or failure to the panel. The overlay stays visible for at least 400 ms if shown.

Saved-place search and rating changes wait 300 ms before the paginated query.
