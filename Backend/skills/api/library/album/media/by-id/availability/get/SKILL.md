---
name: api-library-album-media-by-id-availability-get
description: "Current behavior of GET /api/library/album/media/{mediaId:guid}/availability."
---

# GET /api/library/album/media/{mediaId:guid}/availability

- Routes: `/api/library/album/media/{mediaId:guid}/availability`, `/api/library/gallery/{mediaId:guid}/availability`, `/api/media/{mediaId:guid}/availability`.
- Access: Requires an authenticated administrator.
- Inputs: Guid mediaId.
- Flow: Returns whether the active media file exists on disk, with no-store cache control.
- Source: `Backend/Apis/Controllers/MediaController.cs` (GetMediaAvailabilityAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.
