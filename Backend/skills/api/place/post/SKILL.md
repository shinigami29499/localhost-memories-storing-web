---
name: api-place-post
description: "Current behavior of POST /api/place."
---

# POST /api/place

- Routes: `/api/location`, `/api/location/place`, `/api/places`, `/api/location/food`, `/api/food-places`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: SavePlaceRequest request.
- Flow: Validates location, marker, text, and up to 12 distinct images, resolves city, and transactionally creates a caller-owned place. Returns the created place and sends a best-effort change event.
- Source: `Backend/Apis/Controllers/PlacesController.cs` (CreatePlaceAsync); `Backend/Infrastructures/Data/ApplicationServices/PlaceService.cs`.

Canonical route: `/api/place`. Previous routes remain aliases.
