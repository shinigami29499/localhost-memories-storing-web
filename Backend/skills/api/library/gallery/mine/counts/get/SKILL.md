---
name: api-library-gallery-mine-counts-get
description: "Current behavior of GET /api/library/gallery/mine/counts."
---

# GET /api/library/gallery/mine/counts

- Routes: `/api/library/gallery/mine/counts`, `/api/media/mine/counts`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: No request parameters.
- Flow: Returns counts for the caller's media.
- Source: `Backend/Apis/Controllers/MediaController.cs` (GetOwnedMediaCountsAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.
