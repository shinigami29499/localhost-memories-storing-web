---
name: api-sync-upload-batches-by-id-pause-post
description: "Current behavior of POST /api/sync/upload/batches/{batchId:guid}/pause."
---

# POST /api/sync/upload/batches/{batchId:guid}/pause

- Routes: `/api/sync/upload/batches/{batchId:guid}/pause`, `/api/uploads/batches/{batchId:guid}/pause`, `/api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/pause`, `/api/uploads/batches/{batchId:guid}/items/{itemId:guid}/pause`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid batchId, Guid? itemId.
- Flow: Pauses pending or uploading items in the caller-owned batch, either one item or all. Recomputes batch state under a lock.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (PauseAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.
