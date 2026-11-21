---
name: use-upload-runtime
description: Start and stop upload recovery for an authenticated account.
---

The shared upload hook starts recovery and notifications only for an active authenticated user, and stops the runtime when the account changes or becomes view-only. It refreshes upload, album, and media queries on completion. New batches have an album ID and completion messages open that album. Source: Frontend/src/features/uploads/hooks/useUploadRuntime.ts.
