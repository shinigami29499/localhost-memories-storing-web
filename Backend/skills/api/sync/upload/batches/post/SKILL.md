---
name: api-sync-upload-batches-post
description: "Current behavior of POST /api/sync/upload/batches."
---

# POST /api/sync/upload/batches

- Routes: `/api/sync/upload/batches`, `/api/uploads/batches`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: CreateUploadBatchRequest request.
- Flow: Registers an upload batch and its items for the caller, returns the created batch, and notifies upload listeners.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (CreateBatchAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.
