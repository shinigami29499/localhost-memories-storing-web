---
name: api-location-travel-map-get
description: "Current behavior of GET /api/location/travel/map."
---

# GET /api/location/travel/map

- Routes: `/api/location/travel/map`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] int offset = 0, [FromQuery] int limit = 100, [FromQuery] double west = -180, [FromQuery] double south = -90, [FromQuery] double east = 180, [FromQuery] double north = 90.
- Flow: Returns located media visible to the caller using offset, limit and geographic bounds.
- Source: `Backend/Apis/Controllers/MediaController.cs` (GetLocatedMediaPageAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.

Canonical route: `/api/place/travel/map`. Previous routes remain aliases.
