---
name: api-library-album-by-id-favorite-post
description: "Add the caller's favorite to a visible album."
---

# POST /api/library/album/{collectionId}/favorite

- Access: Requires authentication.
- Inputs: Guid collectionId.
- Flow: Adds or restores the caller's soft-deleted album favorite. Repeated requests are safe. Private albums remain hidden from non-owners.
- Response: 204 No Content.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (FavoriteCollectionAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`; `Backend/Infrastructures/Data/Implementations/CollectionRepository.cs`.
