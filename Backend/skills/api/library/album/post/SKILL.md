---
name: api-library-album-post
description: "Current behavior of POST /api/library/album."
---

# POST /api/library/album

- Routes: `/api/library/album`, `/api/collections`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: CreateCollectionRequest request.
- Flow: Creates a caller-owned collection with normalized name and caption. A public collection triggers a best-effort PublicAlbumPublished event.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (CreateCollectionAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
