---
name: api-library-album-media-changes-get
description: "Current behavior of GET /api/library/album/media/changes."
---

# GET /api/library/album/media/changes

- Routes: `/api/library/album/media/changes`, `/api/library/gallery/changes`, `/api/media/changes`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] DateTime? since.
- Flow: Returns compact change markers since an optional timestamp so clients can reconcile their album media cache. Caller identity and administrator status determine visibility.
- Source: `Backend/Apis/Controllers/MediaController.cs` (GetMediaChangesAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.

Canonical route: `/api/library/album/media/change`. Previous routes remain aliases.
