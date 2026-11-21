---
name: api-library-album-by-id-media-by-id-delete
description: "Current behavior of DELETE /api/library/album/{collectionId:guid}/media/{mediaId:guid}."
---

# DELETE /api/library/album/{collectionId:guid}/media/{mediaId:guid}

- Routes: `/api/library/album/{collectionId:guid}/media/{mediaId:guid}`, `/api/collections/{collectionId:guid}/media/{mediaId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId, Guid mediaId.
- Flow: Uses the same flow as batch removal. An album owner removes the link and permanently deletes storage for media they own. A missing link is a no-op. Returns the updated album.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (RemoveMediaAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
