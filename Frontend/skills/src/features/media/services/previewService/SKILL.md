---
name: preview-service
description: "Client operations for media preview drafts."
---

`src/features/media/services/previewService.ts` lists, reads, uploads, and releases authenticated preview drafts using `/api/preview`. Upload uses the shared multipart XHR client with native byte progress and an abort signal. Server-side ownership and draft cleanup rules apply.
