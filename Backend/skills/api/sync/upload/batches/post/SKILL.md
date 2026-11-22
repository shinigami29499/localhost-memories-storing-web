---
name: api-sync-upload-batches-post
description: "Current behavior of POST /api/sync/upload/batches."
---

# POST /api/sync/upload/batches

- Routes: `/api/sync/upload/batches`, `/api/uploads/batches`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Album ID and file metadata for each upload item.
- Flow: Validates the destination album exists and belongs to the caller. Persists the album ID with the batch and items, returns the created batch, and notifies upload listeners.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (CreateBatchAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.

Canonical route: `/api/sync/upload/batch`. Previous routes remain aliases.
