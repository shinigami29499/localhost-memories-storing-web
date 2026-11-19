---
name: api-library-album-by-id-caption-put
description: "Current behavior of PUT /api/library/album/{collectionId:guid}/caption."
---

# PUT /api/library/album/{collectionId:guid}/caption

- Routes: `/api/library/album/{collectionId:guid}/caption`, `/api/collections/{collectionId:guid}/caption`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId, UpdateCollectionCaptionRequest request.
- Flow: The owner changes the normalized caption; a missing or non-owned album is reported as not found. Sends a best-effort AlbumChanged event.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (UpdateCollectionCaptionAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
