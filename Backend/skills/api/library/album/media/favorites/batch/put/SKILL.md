---
name: api-library-album-media-favorites-batch-put
description: "Current behavior of PUT /api/library/album/media/favorites/batch."
---

# PUT /api/library/album/media/favorites/batch

- Routes: `/api/library/album/media/favorites/batch`, `/api/library/gallery/favorites/batch`, `/api/media/favorites/batch`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: SetMediaFavoritesRequest request.
- Flow: Sets the requested favorite state for a batch of media IDs for the current user; returns no content.
- Source: `Backend/Apis/Controllers/MediaFavoritesController.cs` (SetFavoritesAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs`.

Canonical route: `/api/library/album/media/favorite/batch`. Previous routes remain aliases.
