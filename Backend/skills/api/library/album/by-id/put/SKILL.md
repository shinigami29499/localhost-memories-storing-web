---
name: api-library-album-by-id-put
description: "Current behavior of PUT /api/library/album/{collectionId:guid}."
---

# PUT /api/library/album/{collectionId:guid}

- Routes: `/api/library/album/{collectionId:guid}`, `/api/collections/{collectionId:guid}`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid collectionId, UpdateCollectionRequest request.
- Flow: The owner changes name, visibility, preview, and optionally caption. Preview association is transactional; the old preview is cleaned up afterward. Publication or change events are best effort.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (UpdateCollectionAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
