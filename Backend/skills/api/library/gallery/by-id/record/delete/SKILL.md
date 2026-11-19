---
name: api-library-gallery-by-id-record-delete
description: "Current behavior of DELETE /api/library/gallery/{mediaId:guid}/record."
---

# DELETE /api/library/gallery/{mediaId:guid}/record

- Routes: `/api/library/gallery/{mediaId:guid}/record`, `/api/media/{mediaId:guid}/record`.
- Access: Requires an authenticated administrator.
- Inputs: Guid mediaId.
- Flow: Removes the gallery record and database links without accessing storage. Returns no content and emits a best-effort MediaChanged event.
- Source: `Backend/Apis/Controllers/MediaController.cs` (DeleteMediaRecordAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.
