---
name: api-library-gallery-get
description: "Current behavior of GET /api/library/gallery."
---

# GET /api/library/gallery

- Routes: `/api/library/album/media`, `/api/library/gallery`, `/api/media`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] MediaPageRequest request.
- Flow: Returns an active gallery page with offset, limit, and optional media kind. Viewer identity determines visibility and favorite state.
- Source: `Backend/Apis/Controllers/MediaController.cs` (GetMediaAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.

Canonical route: `/api/library/album/media`. Previous routes remain aliases.
