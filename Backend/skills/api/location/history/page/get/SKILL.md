---
name: api-location-history-page-get
description: "Current behavior of GET /api/location/history/page."
---

# GET /api/location/history/page

- Routes: `/api/location/history/page`, `/api/location/place/history/page`, `/api/places/history/page`, `/api/location/food/history/page`, `/api/food-places/history/page`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] int page = 1, [FromQuery] int limit = 20, [FromQuery] bool all = false, [FromQuery] Guid? placeId = null.
- Flow: Returns a visit history page, optionally filtered by place. The all flag selects all users; otherwise it selects the caller. A missing place fails.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (GetVisitPageAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.

Canonical route: `/api/place/history/page`. Previous routes remain aliases.
