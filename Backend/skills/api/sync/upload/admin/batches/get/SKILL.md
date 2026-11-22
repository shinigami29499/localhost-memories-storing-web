---
name: api-sync-upload-admin-batches-get
description: "Current behavior of GET /api/sync/upload/admin/batches."
---

# GET /api/sync/upload/admin/batches

- Routes: `/api/sync/upload/admin/batches`, `/api/uploads/admin/batches`.
- Access: Requires an authenticated administrator.
- Inputs: [FromQuery] UploadListRequest request.
- Flow: Returns paginated upload batches across users, optionally filtered by creation dates.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (GetAllBatchesAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.

Canonical route: `/api/sync/upload/admin/batch`. Previous routes remain aliases.
