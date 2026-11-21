---
name: api-library-album-by-id-media-batch-remove-post
description: "Current behavior of POST /api/library/album/{collectionId:guid}/media/batch/remove."
---

# POST /api/library/album/{collectionId:guid}/media/batch/remove

- Routes: `/api/library/album/{collectionId:guid}/media/batch/remove`, `/api/collections/{collectionId:guid}/media/batch/remove`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId, UpdateCollectionMediaBatchRequest request.
- Flow: The album owner removes selected links and clears a matching cover. Files owned by the album owner are marked deleted transactionally, then immediately purged from storage with generated previews. Links to purged files are removed from every album. Files owned by other users lose only the selected album links. A worker retries failed storage deletions. Previously removed links are safe to retry. Returns the album and emits a best-effort change event.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (RemoveMediaBatchAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
