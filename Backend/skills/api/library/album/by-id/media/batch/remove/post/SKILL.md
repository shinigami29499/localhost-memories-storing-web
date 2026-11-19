---
name: api-library-album-by-id-media-batch-remove-post
description: "Current behavior of POST /api/library/album/{collectionId:guid}/media/batch/remove."
---

# POST /api/library/album/{collectionId:guid}/media/batch/remove

- Routes: `/api/library/album/{collectionId:guid}/media/batch/remove`, `/api/collections/{collectionId:guid}/media/batch/remove`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId, UpdateCollectionMediaBatchRequest request.
- Flow: The owner removes selected media links by soft delete and clears the preview if selected. Missing media causes failure; returns the album and sends a best-effort change event.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (RemoveMediaBatchAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
