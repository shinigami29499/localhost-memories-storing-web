---
name: api-library-album-by-id-media-post
description: "Current behavior of POST /api/library/album/{collectionId:guid}/media."
---

# POST /api/library/album/{collectionId:guid}/media

- Routes: `/api/library/album/{collectionId:guid}/media`, `/api/collections/{collectionId:guid}/media`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId, AddCollectionMediaRequest request.
- Flow: The owner adds an existing media item. An existing association is left unchanged. Returns the album and sends a best-effort change event.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (AddMediaAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
