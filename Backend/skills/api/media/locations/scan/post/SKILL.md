---
name: api-media-locations-scan-post
description: "Current behavior of POST /api/media/locations/scan."
---

# POST /api/media/locations/scan

- Routes: `/api/location/travel/scan`, `/api/media/locations/scan`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] int offset = 0.
- Flow: Scans up to 25 unscanned photos for GPS, scoped to the caller unless administrator. Accepts offset and returns scan results.
- Source: `Backend/Apis/Controllers/MediaController.cs` (ScanLocationsAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.
