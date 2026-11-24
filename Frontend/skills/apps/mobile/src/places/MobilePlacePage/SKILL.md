---
name: mobile-mobileplacepage
description: "Mobile places and visits."
---

# Mobile places and visits

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

places/MobilePlacePage.tsx uses shared pages/place/usePlacePageController.tsx. It coordinates map, saved places and visit history with search and filters. Users can create places and check in; owners or admins can edit places and move photos. Deletion and moves use confirmation. Home selection uses location access. The map links to Albums for new uploads.

Saved-place search and rating changes wait 300 ms before the paginated query.

The map panel owns one loading overlay across module import and renderer initialization. The overlay appears after 200 ms and remains visible at least 400 ms if shown. The renderer reports readiness or failure to the panel. Map data, saved places and visit history use delayed inline placeholders while their queries run.
