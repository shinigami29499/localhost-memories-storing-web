---
name: use-upload-management
description: Select browser-cached upload rows and remove terminal records.
---

`src/pages/uploads/useUploadManagement.ts` supplies upload history to the web and mobile views. It selects rows for the signed-in user and sorts them newest first. The history has no date filter or read state.

The shared runtime handles cancellation, retry, and restart. After confirmation, removing a terminal row deletes only its cached record and any cached source file. The album and stored media are unaffected.
