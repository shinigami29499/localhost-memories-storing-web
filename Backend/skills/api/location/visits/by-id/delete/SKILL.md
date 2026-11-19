---
name: api-location-visits-by-id-delete
description: "Current behavior of DELETE /api/location/visits/{visitId:guid}."
---

# DELETE /api/location/visits/{visitId:guid}

- Routes: `/api/location/visits/{visitId:guid}`, `/api/location/place/visits/{visitId:guid}`, `/api/places/visits/{visitId:guid}`, `/api/location/food/visits/{visitId:guid}`, `/api/food-places/visits/{visitId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid visitId.
- Flow: Only the visit owner can soft-delete a visit. Returns no content and sends a best-effort PlacesChanged event.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (DeletePlaceVisitAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.
