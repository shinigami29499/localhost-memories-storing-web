---
name: api-library-album-by-id-media-file-by-id-put
description: Store a file directly in an album using a client-generated media ID.
---

`PUT /api/library/album/{albumId}/media/file/{mediaId}` accepts one multipart `file` and returns `{ mediaId }` once media storage and album membership commit. Source locations are `Backend/Apis/Controllers/UploadsController.cs` and `Backend/Infrastructures/Data/ApplicationServices/UploadService.cs`.

The authenticated contributor can write to a public album or one they own. The service validates the identifier, filename, and file size. Storage applies the existing media type rules. The service rechecks album access under the shared album lifecycle lock and compensates for a failed commit by deleting the new stored file.

Retry with the same media ID, destination, filename, and size returns the existing result for the same owner. Conflicting use returns a conflict. The first successful commit emits the existing album change event. This endpoint creates media and album membership only. The browser owns transfer and history records.
