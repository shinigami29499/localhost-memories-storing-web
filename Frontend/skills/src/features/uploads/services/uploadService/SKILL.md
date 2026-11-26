---
name: upload-service
description: Upload album media directly and look up images from legacy batches.
---

`src/features/uploads/services/uploadService.ts` sends a single multipart file to `PUT /api/library/album/{albumId}/media/file/{mediaId}`. The caller generates a media ID once and reuses it for retry. A matching response confirms file storage. The old batch image lookup remains available to the location helper.

`packages/api/src/index.ts` uses native XHR upload events with an abort signal and existing authentication. It measures the multipart header length and excludes framing from transferred file bytes. The upload load event confirms request-body completion.
