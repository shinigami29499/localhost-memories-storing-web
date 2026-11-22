---
name: api-sync-upload-batch-get
description: "Current behavior of GET /api/sync/upload/batch."
---

# GET /api/sync/upload/batch

- Routes: `/api/sync/upload/batches`, `/api/uploads/batches`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] UploadListRequest request.
- Flow: Returns a paginated list of the caller's upload batches, optionally filtered by creation dates.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (GetOwnBatchesAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.

Canonical route: `/api/sync/upload/batch`. Previous routes remain aliases.
