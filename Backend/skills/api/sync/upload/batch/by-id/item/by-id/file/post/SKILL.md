---
name: api-sync-upload-batch-by-id-item-by-id-file-post
description: "Current behavior of POST /api/sync/upload/batch/{batchId:guid}/item/{itemId:guid}/file."
---

# POST /api/sync/upload/batch/{batchId:guid}/item/{itemId:guid}/file

- Routes: `/api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/file`, `/api/uploads/batches/{batchId:guid}/items/{itemId:guid}/file`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid batchId, Guid itemId, IFormFile file.
- Flow: Accepts the file for an already-started item owned by the caller. Filename and size must match registration. The destination must be public or owned by the caller. The service rechecks current permissions under the album lock before committing. Storage failure marks the item failed. A failed commit deletes the stored file.
- Output: The media belongs to the contributor. Its album membership and the item's success commit together. The response returns the item. The album change event identifies the album owner separately from the contributor.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (UploadFileAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.

Canonical route: `/api/sync/upload/batch/{batchId:guid}/item/{itemId:guid}/file`. Previous routes remain aliases.
