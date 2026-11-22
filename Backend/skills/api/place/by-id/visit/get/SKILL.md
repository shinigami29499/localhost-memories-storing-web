---
name: api-place-by-id-visit-get
description: "Current behavior of GET /api/place/{placeId:guid}/visit."
---

# GET /api/place/{placeId:guid}/visit

- Routes: `/api/location/{placeId:guid}/visits`, `/api/location/place/{placeId:guid}/visits`, `/api/places/{placeId:guid}/visits`, `/api/location/food/{placeId:guid}/visits`, `/api/food-places/{placeId:guid}/visits`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid placeId.
- Flow: Returns visit history for the specified place; a missing place fails.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (GetPlaceVisitHistoryForPlaceAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.

Canonical route: `/api/place/{placeId:guid}/visit`. Previous routes remain aliases.
