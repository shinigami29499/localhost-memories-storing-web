---
name: use-album-upload
description: Queue selected media from album detail on web and mobile.
---

`src/features/albums/hooks/useAlbumUpload.ts` exposes a shared file picker ref and submission action. Active users can upload to public albums or private albums they own. The server repeats the permission check.

Selection queues the files for direct upload in the shared runtime. The picker stays available while transfers run. Transfer rows appear on the Upload page at /upload. The runtime refreshes album media after confirmed storage.
