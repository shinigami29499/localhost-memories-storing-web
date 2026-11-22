---
name: api-library-album-get
description: "Current behavior of GET /api/library/album."
---

# GET /api/library/album

- Routes: `/api/library/album`, `/api/collections`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: [FromQuery] CollectionListRequest request.
- Flow: Returns collections for scope mine, public, or all. Only administrators can request all; the optional media filter, viewer-specific album favorite state, and preview favorite state are applied.
- Output: Each album includes its nullable calendar `albumDate` and audited `createdAt`.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (GetCollectionsAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
