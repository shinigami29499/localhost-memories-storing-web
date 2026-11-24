---
name: place-page-controller
description: Shared saved-place, map, and visit-history controller.
---

`Frontend/src/pages/place/usePlacePageController.tsx` coordinates saved places, map data, visit history, editing, and confirmations for web and mobile. Search and rating changes are debounced before loading or filtering results. The saved-place query key includes both values and its request receives TanStack Query's cancellation signal. Location filters select an existing client-filtered list, and visit-history search filters loaded history. Place edits require the existing ownership or administrator permissions.

Place save shows immediate pending feedback and rejects repeated submissions until the request settles. Failure keeps the editor open for retry.
