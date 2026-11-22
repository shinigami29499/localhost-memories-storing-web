---
name: api-library-album-by-id-get
description: "Current behavior of GET /api/library/album/{collectionId:guid}."
---

# GET /api/library/album/{collectionId:guid}

- Routes: `/api/library/album/{collectionId:guid}`, `/api/collections/{collectionId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId.
- Flow: Returns a collection visible to the caller, with viewer-specific album and preview favorite state. The service enforces private collection visibility.
- Output: The album includes its nullable calendar `albumDate` and audited `createdAt`.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (GetCollectionAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
