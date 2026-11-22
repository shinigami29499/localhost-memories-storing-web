---
name: api-library-gallery-changes-get
description: "Current behavior of GET /api/library/gallery/changes."
---

# GET /api/library/gallery/changes

- Routes: `/api/library/album/media/changes`, `/api/library/gallery/changes`, `/api/media/changes`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] DateTime? since.
- Flow: Returns compact change markers since an optional timestamp for gallery reconciliation, taking caller identity and administrator status.
- Source: `Backend/Apis/Controllers/MediaController.cs` (GetMediaChangesAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.

Canonical route: `/api/library/album/media/change`. Previous routes remain aliases.
