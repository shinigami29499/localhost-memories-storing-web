---
name: api-library-album-media-by-id-favorite-post
description: "Current behavior of POST /api/library/album/media/{mediaId:guid}/favorite."
---

# POST /api/library/album/media/{mediaId:guid}/favorite

- Routes: `/api/library/album/media/{mediaId:guid}/favorite`, `/api/library/gallery/{mediaId:guid}/favorite`, `/api/media/{mediaId:guid}/favorite`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid mediaId.
- Flow: Marks the media as a favorite for the current user; returns no content.
- Source: `Backend/Apis/Controllers/MediaFavoritesController.cs` (FavoriteAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs`.
