---
name: api-sync-upload-batches-by-id-get
description: "Current behavior of GET /api/sync/upload/batches/{batchId:guid}."
---

# GET /api/sync/upload/batches/{batchId:guid}

- Routes: `/api/sync/upload/batches/{batchId:guid}`, `/api/uploads/batches/{batchId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid batchId.
- Flow: Returns a batch only when it belongs to the caller; other or missing batches are reported as not found.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (GetBatchAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.

Canonical route: `/api/sync/upload/batch/{batchId:guid}`. Previous routes remain aliases.
