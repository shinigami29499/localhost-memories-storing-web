---
name: api-sync-upload-batches-by-id-items-by-id-resume-post
description: "Current behavior of POST /api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/resume."
---

# POST /api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/resume

- Routes: `/api/sync/upload/batches/{batchId:guid}/resume`, `/api/uploads/batches/{batchId:guid}/resume`, `/api/sync/upload/batches/{batchId:guid}/items/{itemId:guid}/resume`, `/api/uploads/batches/{batchId:guid}/items/{itemId:guid}/resume`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid batchId, Guid? itemId.
- Flow: Returns paused items to pending in the caller-owned batch, either one item or all. Recomputes batch state under a lock.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (ResumeAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.
