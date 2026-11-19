---
name: api-library-gallery-by-id-restore-post
description: "Current behavior of POST /api/library/gallery/{mediaId:guid}/restore."
---

# POST /api/library/gallery/{mediaId:guid}/restore

- Routes: `/api/library/gallery/{mediaId:guid}/restore`, `/api/media/{mediaId:guid}/restore`.
- Access: Requires an authenticated administrator.
- Inputs: Guid mediaId.
- Flow: Restores trashed media and coordinates filesystem and database state. Returns no content and emits a best-effort MediaChanged event.
- Source: `Backend/Apis/Controllers/MediaController.cs` (RestoreMediaAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.
