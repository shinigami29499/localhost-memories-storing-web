---
name: upload-service
description: "Client operations for upload batches and items."
---

`src/features/uploads/services/uploadService.ts` manages upload submission, progress, records, and pause or resume through `/api/sync/upload`. Canonical routes use singular `batch`, `item`, and `image` segments. Submission saves files locally before creating the server batch and wakes the upload runtime; failures clean up saved files and propagate the error.
