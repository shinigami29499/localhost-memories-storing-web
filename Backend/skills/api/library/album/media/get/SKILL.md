---
name: api-library-album-media-get
description: "Current behavior of GET /api/library/album/media."
---

# GET /api/library/album/media

- Routes: `/api/library/album/media`, `/api/library/gallery`, `/api/media`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] MediaPageRequest request.
- Flow: Returns a page of active media with offset, limit, and optional media kind. Viewer identity determines visibility and favorite state.
- Source: `Backend/Apis/Controllers/MediaController.cs` (GetMediaAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.
