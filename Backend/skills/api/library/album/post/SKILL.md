---
name: api-library-album-post
description: "Current behavior of POST /api/library/album."
---

# POST /api/library/album

- Routes: `/api/library/album`, `/api/collections`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: CreateCollectionRequest request. Optional `albumDate` is a calendar date in `YYYY-MM-DD` format.
- Flow: Creates a caller-owned collection with normalized name and caption. It stores `albumDate` in the nullable PostgreSQL `collections.album_date` date column and returns it in the album DTO. Requests that omit it leave the column null. Audit stamping still sets `createdAt` to the creation time. A public collection triggers a best-effort PublicAlbumPublished event.
- Source: `Backend/Apis/Controllers/CollectionsController.cs` (CreateCollectionAsync); `Backend/Infrastructures/Data/ApplicationServices/CollectionService.cs`.
