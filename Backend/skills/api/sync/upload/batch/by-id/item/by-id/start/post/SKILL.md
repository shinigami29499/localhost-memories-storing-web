---
name: api-sync-upload-batch-by-id-item-by-id-start-post
description: "Current behavior of POST /api/sync/upload/batch/{batchId:guid}/item/{itemId:guid}/start."
---

# POST /api/sync/upload/batch/{batchId:guid}/item/{itemId:guid}/start

- Routes: `/api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/start`, `/api/uploads/batches/{batchId:guid}/items/{itemId:guid}/start`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid batchId, Guid itemId.
- Flow: Starts a pending item under a batch lock. Only one item may upload per batch; invalid state or concurrent changes produce conflict.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (StartItemAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.

Canonical route: `/api/sync/upload/batch/{batchId:guid}/item/{itemId:guid}/start`. Previous routes remain aliases.
