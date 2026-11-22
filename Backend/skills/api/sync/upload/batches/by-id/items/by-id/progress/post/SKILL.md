---
name: api-sync-upload-batches-by-id-items-by-id-progress-post
description: "Current behavior of POST /api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/progress."
---

# POST /api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/progress

- Routes: `/api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/progress`, `/api/uploads/batches/{batchId:guid}/items/{itemId:guid}/progress`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid batchId, Guid itemId, UploadProgressRequest request.
- Flow: Updates an uploading item's progress from 0 to 99. Invalid values fail validation; a non-uploading item produces conflict.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (ReportProgressAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.

Canonical route: `/api/sync/upload/batch/{batchId:guid}/item/{itemId:guid}/progress`. Previous routes remain aliases.
