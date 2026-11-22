---
name: api-location-map-page-get
description: "Current behavior of GET /api/location/map/page."
---

# GET /api/location/map/page

- Routes: `/api/location/map/page`, `/api/location/place/map/page`, `/api/places/map/page`, `/api/location/food/map/page`, `/api/food-places/map/page`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] int page = 1, [FromQuery] int limit = 100, [FromQuery] double west = -180, [FromQuery] double south = -90, [FromQuery] double east = 180, [FromQuery] double north = 90.
- Flow: Returns a page of map summaries inside validated geographic bounds. Page is 1 to 1,000,000 and limit 1 to 100.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (GetMapPlacesPageAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.

Canonical route: `/api/place/map/page`. Previous routes remain aliases.
