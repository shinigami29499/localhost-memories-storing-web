---
name: mobile-mobileuploadpage
description: Compact mobile upload history loaded from the browser cache.
---

`MobileUploadPage.tsx` serves /upload and uses shared `useUploadManagement` and `UploadHistoryRow` to show the current user's cached transfers as single-line rows. The narrow layout keeps filename, status, progress, and touch actions visible. Transfers show live progress and available speed and ETA. Select the filename to reveal the full name, transfer size, and timestamp. Cancel, retry, and restart act on the selected transfer. The platform confirmation dialog deletes only the local terminal record.
