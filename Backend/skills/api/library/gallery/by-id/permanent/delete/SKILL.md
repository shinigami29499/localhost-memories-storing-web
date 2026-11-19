---
name: api-library-gallery-by-id-permanent-delete
description: "Current behavior of DELETE /api/library/gallery/{mediaId:guid}/permanent."
---

# DELETE /api/library/gallery/{mediaId:guid}/permanent

- Routes: `/api/library/gallery/{mediaId:guid}/permanent`, `/api/media/{mediaId:guid}/permanent`.
- Access: Requires an authenticated administrator.
- Inputs: Guid mediaId.
- Flow: Permanently deletes trashed media with filesystem/database coordination. Returns no content and emits a best-effort MediaChanged event.
- Source: `Backend/Apis/Controllers/MediaController.cs` (PermanentlyDeleteMediaAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.
