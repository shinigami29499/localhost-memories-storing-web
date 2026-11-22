---
name: api-place-visit-get
description: "Current behavior of GET /api/place/visit."
---

# GET /api/place/visit

- Routes: `/api/location/visits`, `/api/location/place/visits`, `/api/places/visits`, `/api/location/food/visits`, `/api/food-places/visits`, `/api/location/history`, `/api/location/place/history`, `/api/places/history`, `/api/location/food/history`, `/api/food-places/history`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: No request parameters.
- Flow: Returns the caller's place visit history.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (GetPlaceVisitHistoryAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.

Canonical route: `/api/place/visit`. Previous routes remain aliases.
