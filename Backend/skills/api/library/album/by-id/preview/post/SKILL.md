---
name: api-library-album-by-id-preview-post
description: "Current behavior of POST /api/library/album/{collectionId:guid}/preview."
---

# POST /api/library/album/{collectionId:guid}/preview

- Routes: `/api/library/album/{collectionId:guid}/preview`, `/api/collections/{collectionId:guid}/preview`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId, IFormFile file.
- Flow: The owner uploads a multipart preview, then associates it transactionally. Association failure releases the draft; replacement cleans up the old preview. Returns the album.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (UploadPreviewImageAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
