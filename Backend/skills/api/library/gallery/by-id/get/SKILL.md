---
name: api-library-gallery-by-id-get
description: "Current behavior of GET /api/library/gallery/{mediaId:guid}."
---

# GET /api/library/gallery/{mediaId:guid}

- Routes: `/api/library/album/media/{mediaId:guid}`, `/api/library/gallery/{mediaId:guid}`, `/api/media/{mediaId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid mediaId.
- Flow: Returns a visible media record by ID; the service enforces access.
- Source: `Backend/Apis/Controllers/MediaController.cs` (GetMediaByIdAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.

Canonical route: `/api/library/album/media/{mediaId:guid}`. Previous routes remain aliases.
