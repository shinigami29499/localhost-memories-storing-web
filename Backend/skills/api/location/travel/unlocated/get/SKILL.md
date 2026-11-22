---
name: api-location-travel-unlocated-get
description: "Current behavior of GET /api/location/travel/unlocated."
---

# GET /api/location/travel/unlocated

- Routes: `/api/location/travel/unlocated`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] int offset = 0, [FromQuery] int limit = 50.
- Flow: Returns a page of visible media without a location using offset and limit.
- Source: `Backend/Apis/Controllers/MediaController.cs` (GetUnlocatedMediaPageAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.

Canonical route: `/api/place/travel/unlocated`. Previous routes remain aliases.
