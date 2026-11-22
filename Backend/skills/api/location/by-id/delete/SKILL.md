---
name: api-location-by-id-delete
description: "Current behavior of DELETE /api/location/{placeId:guid}."
---

# DELETE /api/location/{placeId:guid}

- Routes: `/api/location/{placeId:guid}`, `/api/location/place/{placeId:guid}`, `/api/places/{placeId:guid}`, `/api/location/food/{placeId:guid}`, `/api/food-places/{placeId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid placeId.
- Flow: Only the owner or administrator can soft-delete a place and its media links in a transaction. Removed previews are cleaned up afterward.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (DeletePlaceAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.

Canonical route: `/api/place/{placeId:guid}`. Previous routes remain aliases.
