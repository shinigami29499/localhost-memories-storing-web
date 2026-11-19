---
name: api-sync-upload-recover-post
description: "Current behavior of POST /api/sync/upload/recover."
---

# POST /api/sync/upload/recover

- Routes: `/api/sync/upload/recover`, `/api/uploads/recover`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: No request parameters.
- Flow: Marks the caller's interrupted uploading items failed and refreshes batch status. A concurrent update is logged; upload listeners are notified.
- Source: `Backend/Apis/Controllers/UploadsController.cs` (RecoverInterruptedAsync); `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.
