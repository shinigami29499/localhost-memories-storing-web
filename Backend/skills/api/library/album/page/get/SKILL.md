---
name: api-library-album-page-get
description: "Current behavior of GET /api/library/album/page."
---

# GET /api/library/album/page

- Routes: `/api/library/album/page`, `/api/collections/page`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] CollectionPageRequest request.
- Flow: Returns a paginated collection listing for the requested scope with viewer-specific album favorite state; administrator scope requires administrator permission.
- Output: Each album includes its nullable calendar `albumDate` and audited `createdAt`. The feed keeps its creation-time ordering and cursor.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (GetCollectionsPageAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
