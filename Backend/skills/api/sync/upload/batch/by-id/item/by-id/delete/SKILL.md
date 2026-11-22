---
name: api-sync-upload-batch-by-id-item-by-id-delete
description: "Current behavior of DELETE /api/sync/upload/batch/{batchId:guid}/item/{itemId:guid}."
---

# DELETE /api/sync/upload/batch/{batchId:guid}/item/{itemId:guid}

- Routes: `/api/sync/upload/batches/{batchId:guid}`, `/api/uploads/batches/{batchId:guid}`, `/api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}`, `/api/uploads/batches/{batchId:guid}/items/{itemId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid batchId, Guid? itemId.
- Flow: Soft-deletes a caller-owned batch or selected item. Deleting an individual successful item is rejected. State changes use a transaction and batch lock.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (DeleteRecordAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.

Canonical route: `/api/sync/upload/batch/{batchId:guid}/item/{itemId:guid}`. Previous routes remain aliases.
