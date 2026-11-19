---
name: api-location-by-id-get
description: "Current behavior of GET /api/location/{placeId:guid}."
---

# GET /api/location/{placeId:guid}

- Routes: `/api/location/{placeId:guid}`, `/api/location/place/{placeId:guid}`, `/api/places/{placeId:guid}`, `/api/location/food/{placeId:guid}`, `/api/food-places/{placeId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid placeId.
- Flow: Returns a place by ID, or not found if absent.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (GetPlaceAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.
