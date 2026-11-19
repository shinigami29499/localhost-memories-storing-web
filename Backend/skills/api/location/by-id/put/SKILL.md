---
name: api-location-by-id-put
description: "Current behavior of PUT /api/location/{placeId:guid}."
---

# PUT /api/location/{placeId:guid}

- Routes: `/api/location/{placeId:guid}`, `/api/location/place/{placeId:guid}`, `/api/places/{placeId:guid}`, `/api/location/food/{placeId:guid}`, `/api/food-places/{placeId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid placeId, SavePlaceRequest request.
- Flow: Only the owner or administrator can update a place. The service validates fields and preview images, transactionally updates links, then cleans up removed previews.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (UpdatePlaceAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.
