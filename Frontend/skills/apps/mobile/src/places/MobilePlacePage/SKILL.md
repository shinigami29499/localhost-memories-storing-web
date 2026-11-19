---
name: mobile-mobileplacepage
description: "Mobile places and visits."
---

# Mobile places and visits

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

places/MobilePlacePage.tsx uses shared pages/place/usePlacePageController.tsx. It coordinates map, saved places and visit history with search and filters. Users can create places and check in; owners or admins can edit places and move photos. Deletion and moves use confirmation. Home selection and location-tagged uploads use location access. Failures and partial tagging are reported.
