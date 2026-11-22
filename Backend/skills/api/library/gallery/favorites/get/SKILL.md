---
name: api-library-gallery-favorites-get
description: "Current behavior of GET /api/library/gallery/favorites."
---

# GET /api/library/gallery/favorites

- Routes: `/api/library/album/media/favorites`, `/api/library/gallery/favorites`, `/api/media/favorites`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] MediaPageRequest request.
- Flow: Returns a page of active media favorited by the caller, filtered by pagination and optional media kind.
- Source: `Backend/Apis/Controllers/MediaFavoritesController.cs` (GetFavoritesAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs`.

Canonical route: `/api/library/album/media/favorite`. Previous routes remain aliases.
