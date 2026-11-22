---
name: api-library-album-media-mine-count-get
description: "Current behavior of GET /api/library/album/media/mine/count."
---

# GET /api/library/album/media/mine/count

- Routes: `/api/library/album/media/mine/counts`, `/api/library/gallery/mine/counts`, `/api/media/mine/counts`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: No request parameters.
- Flow: Returns counts for the caller's media.
- Source: `Backend/Apis/Controllers/MediaController.cs` (GetOwnedMediaCountsAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.

Canonical route: `/api/library/album/media/mine/count`. Previous routes remain aliases.
