---
name: api-library-album-by-id-delete
description: "Current behavior of DELETE /api/library/album/{collectionId:guid}."
---

# DELETE /api/library/album/{collectionId:guid}

- Routes: `/api/library/album/{collectionId:guid}`, `/api/collections/{collectionId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId.
- Flow: An owner or administrator soft-deletes the album and its links. Media owned by the album owner are marked deleted in the same transaction. The request removes originals and generated previews from storage after commit. A worker retries storage failures. Links to purged files are removed from every album. Deleting the album removes only the local links to files owned by other users. The endpoint returns no content and sends a best-effort change event.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (DeleteCollectionAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
