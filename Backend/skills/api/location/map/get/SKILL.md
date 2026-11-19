---
name: api-location-map-get
description: "Current behavior of GET /api/location/map."
---

# GET /api/location/map

- Routes: `/api/location/map`, `/api/location/place/map`, `/api/places/map`, `/api/location/food/map`, `/api/food-places/map`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: No request parameters.
- Flow: Returns compact map summaries for places.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (GetMapPlacesAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.
