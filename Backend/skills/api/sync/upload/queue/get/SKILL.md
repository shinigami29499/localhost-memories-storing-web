---
name: api-sync-upload-queue-get
description: "Current behavior of GET /api/sync/upload/queue."
---

# GET /api/sync/upload/queue

- Routes: `/api/sync/upload/queue`, `/api/uploads/queue`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: No request parameters.
- Flow: Returns the caller's pending upload items.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (GetQueueAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.
