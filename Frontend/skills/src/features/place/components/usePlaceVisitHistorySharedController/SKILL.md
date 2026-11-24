---
name: place-visit-history-controller
description: Shared place visit history editing and removal.
---

`Frontend/src/features/place/components/usePlaceVisitHistorySharedController.tsx` supports web and mobile visit history. Owners can edit a visit's note and rating. Removal follows the existing owner, admin, and age checks. Save and removal reject repeated submissions while pending, show busy feedback, and allow retry after failure. A completed save updates the open visit only when it is still selected.
