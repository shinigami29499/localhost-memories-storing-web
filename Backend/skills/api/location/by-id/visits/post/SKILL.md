---
name: api-location-by-id-visits-post
description: "Current behavior of POST /api/location/{placeId:guid}/visits."
---

# POST /api/location/{placeId:guid}/visits

- Routes: `/api/location/{placeId:guid}/visits`, `/api/location/place/{placeId:guid}/visits`, `/api/places/{placeId:guid}/visits`, `/api/location/food/{placeId:guid}/visits`, `/api/food-places/{placeId:guid}/visits`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid placeId.
- Flow: Creates a visit for the caller at an existing place, saves it, and sends a best-effort PlaceCheckedIn event.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (CheckInPlaceAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.
