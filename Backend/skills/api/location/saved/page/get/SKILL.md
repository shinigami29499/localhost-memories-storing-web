---
name: api-location-saved-page-get
description: "Current behavior of GET /api/location/saved/page."
---

# GET /api/location/saved/page

- Routes: `/api/location/saved/page`, `/api/location/place/saved/page`, `/api/places/saved/page`, `/api/location/food/saved/page`, `/api/food-places/saved/page`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] int page = 1, [FromQuery] int limit = 20, [FromQuery] string? search = null, [FromQuery] int minimumRating = 0.
- Flow: Returns a saved-place page filtered by search and minimum rating. Page is 1 to 1,000,000, limit 1 to 100, search at most 120 characters, and rating 0 to 5.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (GetPlacesPageAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.
