---
name: api-library-album-by-id-delete
description: "Current behavior of DELETE /api/library/album/{collectionId:guid}."
---

# DELETE /api/library/album/{collectionId:guid}

- Routes: `/api/library/album/{collectionId:guid}`, `/api/collections/{collectionId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId.
- Flow: The owner or an administrator soft-deletes the album and its media links transactionally, then cleans up its preview and sends a best-effort change event.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (DeleteCollectionAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
