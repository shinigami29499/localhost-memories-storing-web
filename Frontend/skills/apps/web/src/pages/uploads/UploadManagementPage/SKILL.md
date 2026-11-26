---
name: web-upload-management
description: Compact upload history stored in the current browser.
---

`UploadManagementPage.tsx` serves /upload and renders one compact row per cached transfer for the current user, newest first. Rows show status and live progress. Select a filename to show its full name, transfer size, and timestamp. Users can cancel, retry, restart, or delete terminal records after confirmation. Deleting a record does not change the album.

`Frontend/src/pages/uploads/useUploadManagement.ts` shares history selection and deletion between platforms. The page does not call batch history or read-state APIs. There are no toolbar links, read controls, or date filters.
