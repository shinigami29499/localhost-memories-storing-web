---
name: api-sync-upload-batches-viewed-selected-put
description: "Current behavior of PUT /api/sync/upload/batches/viewed/selected."
---

# PUT /api/sync/upload/batches/viewed/selected

- Routes: `/api/sync/upload/batches/viewed/selected`, `/api/uploads/batches/viewed/selected`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: MarkUploadBatchesViewedRequest request.
- Flow: Marks selected caller-owned batches viewed. A null BatchIds request is rejected.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (MarkBatchesViewedAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.

Canonical route: `/api/sync/upload/batch/viewed/selected`. Previous routes remain aliases.
