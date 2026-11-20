---
name: use-upload-runtime
description: Start and stop upload recovery for an authenticated account.
---

The shared upload hook starts recovery and notifications only for an active authenticated user, and stops the runtime when the account changes or becomes view-only. It invalidates upload queries on updates. Source: Frontend/src/features/uploads/hooks/useUploadRuntime.ts.
