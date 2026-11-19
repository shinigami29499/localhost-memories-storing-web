---
name: api-location-visits-all-get
description: "Current behavior of GET /api/location/visits/all."
---

# GET /api/location/visits/all

- Routes: `/api/location/visits/all`, `/api/location/place/visits/all`, `/api/places/visits/all`, `/api/location/food/visits/all`, `/api/food-places/visits/all`, `/api/location/history/all`, `/api/location/place/history/all`, `/api/places/history/all`, `/api/location/food/history/all`, `/api/food-places/history/all`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: No request parameters.
- Flow: Returns all users' place visit history to an authenticated caller.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (GetAllPlaceVisitHistoryAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.
