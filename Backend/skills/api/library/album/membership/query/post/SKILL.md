---
name: api-library-album-membership-query-post
description: "Current behavior of POST /api/library/album/membership/query."
---

# POST /api/library/album/membership/query

- Routes: `/api/library/album/membership/query`, `/api/collections/membership/query`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: CollectionMembershipRequest request.
- Flow: For 1 to 100 distinct nonempty media IDs, returns their membership in the caller's albums, including empty membership lists.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (GetOwnedMembershipAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
