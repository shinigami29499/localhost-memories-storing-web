---
name: api-library-album-media-by-id-favorite-delete
description: "Current behavior of DELETE /api/library/album/media/{mediaId:guid}/favorite."
---

# DELETE /api/library/album/media/{mediaId:guid}/favorite

- Routes: `/api/library/album/media/{mediaId:guid}/favorite`, `/api/library/gallery/{mediaId:guid}/favorite`, `/api/media/{mediaId:guid}/favorite`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid mediaId.
- Flow: Removes the current user's media favorite; returns no content.
- Source: `Backend/Apis/Controllers/MediaFavoritesController.cs` (UnfavoriteAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs`.
