---
name: api-library-album-by-id-media-get
description: "Current behavior of GET /api/library/album/{collectionId:guid}/media."
---

# GET /api/library/album/{collectionId:guid}/media

- Routes: `/api/library/album/{collectionId:guid}/media`, `/api/collections/{collectionId:guid}/media`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId, [FromQuery] MediaPageRequest request.
- Flow: Returns a page of media for a visible collection, including caller-specific favorite state. Pagination and image/video kind are validated.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (GetCollectionMediaAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
