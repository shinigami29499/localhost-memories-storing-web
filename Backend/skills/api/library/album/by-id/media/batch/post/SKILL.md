---
name: api-library-album-by-id-media-batch-post
description: "Current behavior of POST /api/library/album/{collectionId:guid}/media/batch."
---

# POST /api/library/album/{collectionId:guid}/media/batch

- Routes: `/api/library/album/{collectionId:guid}/media/batch`, `/api/collections/{collectionId:guid}/media/batch`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId, UpdateCollectionMediaBatchRequest request.
- Flow: The owner adds distinct existing media IDs; deleted associations are restored and active associations are left unchanged. Returns the album and sends a best-effort change event.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (AddMediaBatchAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
