---
name: api-sync-upload-batches-by-id-items-by-id-file-post
description: "Current behavior of POST /api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/file."
---

# POST /api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/file

- Routes: `/api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/file`, `/api/uploads/batches/{batchId:guid}/items/{itemId:guid}/file`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid batchId, Guid itemId, IFormFile file.
- Flow: Accepts the file for an already-started item. Filename and size must match registration. Storage failure marks the item failed; later database failure deletes the stored file. Completion updates media and batch state transactionally and emits notifications.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (UploadFileAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.
