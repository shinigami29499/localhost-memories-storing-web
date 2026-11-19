---
name: api-previews-by-id-draft-delete
description: Document draft release through DELETE /api/previews/{id}/draft.
---

# DELETE /api/previews/{id}/draft

- Requires authentication. A missing image is a no-op; a non-preview or a preview owned by another user is forbidden. Returns HTTP 204 after release.
- `PreviewService.ReleaseDraftAsync` invokes cleanup. Cleanup locks and rechecks references; referenced previews stay. Unreferenced previews move to purge storage, are soft-deleted transactionally, and then their file is removed.
- If saving the deletion fails after moving the file, cleanup attempts to restore it and rethrows. Sources: `Apis/Controllers/PreviewsController.cs` and `Infrastructures/Data/ApplicationServices/PreviewService.cs`.
