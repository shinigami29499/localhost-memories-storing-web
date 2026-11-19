---
name: api-library-gallery-deleted-get
description: "Current behavior of GET /api/library/gallery/deleted."
---

# GET /api/library/gallery/deleted

- Routes: `/api/library/gallery/deleted`, `/api/media/deleted`.
- Access: Requires an authenticated administrator.
- Inputs: [FromQuery] MediaPageRequest request.
- Flow: Returns a paginated deleted-media view with optional media kind.
- Source: `Backend/Apis/Controllers/MediaController.cs` (GetDeletedMediaAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.
