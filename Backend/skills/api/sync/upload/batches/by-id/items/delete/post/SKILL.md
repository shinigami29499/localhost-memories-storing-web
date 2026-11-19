---
name: api-sync-upload-batches-by-id-items-delete-post
description: "Current behavior of POST /api/sync/upload/batches/{batchId:guid}/items/delete."
---

# POST /api/sync/upload/batches/{batchId:guid}/items/delete

- Routes: `/api/sync/upload/batches/{batchId:guid}/items/delete`, `/api/uploads/batches/{batchId:guid}/items/delete`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid batchId, [FromBody] Guid[] itemIds.
- Flow: Soft-deletes 1 to 1,000 distinct selected item IDs in a caller-owned batch. Successful item records cannot be deleted; missing items or concurrent changes fail.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (DeleteRecordsAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.
