---
name: mobile-mobilealbumpage
description: "Mobile album detail."
---

# Mobile album detail

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

gallery/MobileAlbumPage.tsx delegates to shared pages/albums/useAlbumDetail.ts. Route parameter selects an album. Users can filter paginated media, preview, select, favorite and copy the link. Owners can add images and videos through the upload queue, edit album metadata and caption, and confirm permanent deletion of selected media. Deletion refreshes album, media and place queries. Selection is reconciled as data changes.
