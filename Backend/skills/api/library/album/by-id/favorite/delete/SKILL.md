---
name: api-library-album-by-id-favorite-delete
description: "Remove the caller's favorite from a visible album."
---

# DELETE /api/library/album/{collectionId}/favorite

- Access: Requires authentication.
- Inputs: Guid collectionId.
- Flow: Soft-deletes the caller's active album favorite; repeated requests are safe. Private albums remain hidden from non-owners.
- Response: 204 No Content.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (UnfavoriteCollectionAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`; `Backend/Infrastructures/Data/Implementations/CollectionRepository.cs`.
