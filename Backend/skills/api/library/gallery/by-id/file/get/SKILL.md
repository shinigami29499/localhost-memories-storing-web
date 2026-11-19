---
name: api-library-gallery-by-id-file-get
description: "Current behavior of GET /api/library/gallery/{mediaId:guid}/file."
---

# GET /api/library/gallery/{mediaId:guid}/file

- Routes: `/api/library/gallery/{mediaId:guid}/file`, `/api/media/{mediaId:guid}/file`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid mediaId, [FromQuery] bool includeDeleted = false, [FromQuery] bool preview = false, [FromQuery] int previewSize = 640.
- Flow: Streams the original or a preview with range support. Deleted files require administrator permission; preview sizes must be 320 or 640. Preview and deleted responses use no-store.
- Source: `Backend/Apis/Controllers/MediaController.cs` (GetFileAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.
