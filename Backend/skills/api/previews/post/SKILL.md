---
name: api-previews-post
description: Document preview draft upload through POST /api/previews.
---

# POST /api/previews

- Requires authentication and a multipart `file`. Returns the created media DTO with HTTP 200.
- `PreviewService.UploadAsync` rejects an empty file, stores the image, and persists a preview-only media record owned by the caller with a one-day draft expiry.
- If record creation or persistence fails after storage succeeds, the service deletes the stored file and rethrows. The storage adapter performs its own image checks.
- Sources: `Apis/Controllers/PreviewsController.cs` and `Infrastructures/Data/ApplicationServices/PreviewService.cs`.
