---
name: api-library-gallery-by-id-delete
description: "Current behavior of DELETE /api/library/gallery/{mediaId:guid}."
---

# DELETE /api/library/gallery/{mediaId:guid}

- Routes: `/api/library/gallery/{mediaId:guid}`, `/api/media/{mediaId:guid}`.
- Access: Requires an authenticated administrator.
- Inputs: Guid mediaId.
- Flow: Moves media to trash and updates database state, with storage compensation on failure. Returns no content and emits a best-effort MediaChanged event.
- Source: `Backend/Apis/Controllers/MediaController.cs` (DeleteMediaAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.
