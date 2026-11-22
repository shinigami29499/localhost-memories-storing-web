---
name: api-place-visit-by-id-put
description: "Current behavior of PUT /api/place/visit/{visitId:guid}."
---

# PUT /api/place/visit/{visitId:guid}

- Routes: `/api/location/visits/{visitId:guid}`, `/api/location/place/visits/{visitId:guid}`, `/api/places/visits/{visitId:guid}`, `/api/location/food/visits/{visitId:guid}`, `/api/food-places/visits/{visitId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid visitId, UpdatePlaceVisitRequest request.
- Flow: Only the visit owner can update note and rating. Note is trimmed and limited to 2,000 characters; rating is 0 to 5. Returns the updated visit.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (UpdatePlaceVisitAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.

Canonical route: `/api/place/visit/{visitId:guid}`. Previous routes remain aliases.
