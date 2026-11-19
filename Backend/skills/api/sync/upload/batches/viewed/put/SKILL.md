---
name: api-sync-upload-batches-viewed-put
description: "Current behavior of PUT /api/sync/upload/batches/viewed."
---

# PUT /api/sync/upload/batches/viewed

- Routes: `/api/sync/upload/batches/viewed`, `/api/uploads/batches/viewed`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: No request parameters.
- Flow: Marks all caller-owned batches viewed and returns no content.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (MarkAllBatchesViewedAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.
