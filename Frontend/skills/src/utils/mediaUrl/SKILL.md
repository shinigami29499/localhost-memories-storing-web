---
name: media-url
description: "Build authenticated URLs for media files and previews."
---

`src/utils/media.ts` builds file URLs under `/api/library/album/media/{mediaId}/file`. Browser media elements pass the current access token through the `accessToken` query parameter; the backend accepts it only on file routes. Preview URLs add the preview parameters, and deleted-media requests retain their existing query flag.

The configured API base is used unless a local development address would point a remote browser at itself, in which case URLs use the browser's origin.
