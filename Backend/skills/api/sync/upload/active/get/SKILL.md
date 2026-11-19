---
name: api-sync-upload-active-get
description: "Current behavior of GET /api/sync/upload/active."
---

# GET /api/sync/upload/active

- Routes: `/api/sync/upload/active`, `/api/uploads/active`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: No request parameters.
- Flow: Returns the caller's active upload batches.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (GetActiveAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.
