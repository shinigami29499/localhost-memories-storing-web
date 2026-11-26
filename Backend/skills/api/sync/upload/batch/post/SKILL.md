---
name: api-sync-upload-batch-post
description: "Current behavior of POST /api/sync/upload/batch."
---

# POST /api/sync/upload/batch

- Routes: `/api/sync/upload/batches`, `/api/uploads/batches`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Album ID and file metadata for each upload item.
- Flow: Active callers can queue uploads to a public album or a private album they own. A missing album or another user's private album returns 404. The batch and its items belong to the caller. The service stores the destination ID, returns the batch, and notifies upload listeners.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (CreateBatchAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.

Canonical route: `/api/sync/upload/batch`. Previous routes remain aliases.
