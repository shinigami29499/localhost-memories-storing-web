---
name: media-service
description: "Client operations for library media and favorites."
---

`src/features/media/services/mediaService.ts` uses the shared authenticated API client to list media, read counts or a media record, check file availability, and manage favorites. Requests use `/api/library/album/media`; the backend also retains the legacy `/api/library/gallery` and `/api/media` routes.

Lists accept pagination and an optional media-kind filter. Favorite routes use the singular `favorite` segment; owned counts use `mine/count`. The availability check bypasses caches. Authentication, refresh, and API error handling are owned by `src/services/api.ts`.
