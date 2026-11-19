---
name: api-sync-upload-batches-by-id-images-get
description: "Current behavior of GET /api/sync/upload/batches/{batchId:guid}/images."
---

# GET /api/sync/upload/batches/{batchId:guid}/images

- Routes: `/api/sync/upload/batches/{batchId:guid}/images`, `/api/uploads/batches/{batchId:guid}/images`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid batchId.
- Flow: Returns image IDs for a caller-owned batch.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (GetBatchImageIdsAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.
