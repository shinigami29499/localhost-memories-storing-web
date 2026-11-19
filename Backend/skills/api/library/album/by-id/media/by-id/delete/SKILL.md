---
name: api-library-album-by-id-media-by-id-delete
description: "Current behavior of DELETE /api/library/album/{collectionId:guid}/media/{mediaId:guid}."
---

# DELETE /api/library/album/{collectionId:guid}/media/{mediaId:guid}

- Routes: `/api/library/album/{collectionId:guid}/media/{mediaId:guid}`, `/api/collections/{collectionId:guid}/media/{mediaId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId, Guid mediaId.
- Flow: The owner soft-deletes an existing media association and clears a matching preview; an absent association is a no-op. Returns the album.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (RemoveMediaAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
