---
name: api-location-saved-get
description: "Current behavior of GET /api/location/saved."
---

# GET /api/location/saved

- Routes: `/api/location`, `/api/location/place`, `/api/places`, `/api/location/food`, `/api/food-places`, `/api/location/saved`, `/api/location/place/saved`, `/api/places/saved`, `/api/location/food/saved`, `/api/food-places/saved`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: No request parameters.
- Flow: Returns saved places. Both the base route and saved route call the same operation.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (GetPlacesAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.

Canonical route: `/api/place/saved`. Previous routes remain aliases.
