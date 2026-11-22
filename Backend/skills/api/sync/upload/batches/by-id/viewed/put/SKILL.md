---
name: api-sync-upload-batches-by-id-viewed-put
description: "Current behavior of PUT /api/sync/upload/batches/{batchId:guid}/viewed."
---

# PUT /api/sync/upload/batches/{batchId:guid}/viewed

- Routes: `/api/sync/upload/batches/{batchId:guid}/viewed`, `/api/uploads/batches/{batchId:guid}/viewed`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid batchId.
- Flow: Marks a caller-owned batch viewed; returns no content if found and not found otherwise.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (MarkBatchViewedAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.

Canonical route: `/api/sync/upload/batch/{batchId:guid}/viewed`. Previous routes remain aliases.
