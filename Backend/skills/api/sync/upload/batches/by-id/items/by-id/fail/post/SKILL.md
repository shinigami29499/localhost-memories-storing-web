---
name: api-sync-upload-batches-by-id-items-by-id-fail-post
description: "Current behavior of POST /api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/fail."
---

# POST /api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/fail

- Routes: `/api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/fail`, `/api/uploads/batches/{batchId:guid}/items/{itemId:guid}/fail`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid batchId, Guid itemId, FailUploadItemRequest request.
- Flow: Marks a pending or uploading caller-owned item failed and records bounded error details. Other states produce conflict.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (FailItemAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.
