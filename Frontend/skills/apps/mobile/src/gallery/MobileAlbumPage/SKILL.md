---
name: mobile-mobilealbumpage
description: "Mobile album detail."
---

# Mobile album detail

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

gallery/MobileAlbumPage.tsx delegates to shared pages/albums/useAlbumDetail.ts. Route parameter selects an album. Users can filter paginated media, preview, select, favorite and copy the link. The album header holds the Add media control and the favorite and delete controls for a selection. Owners can add images and videos through the upload queue, edit album metadata and caption, and confirm permanent deletion of selected media. The detail page has no floating action bar. Deletion refreshes album, media and place queries. Selection is reconciled as data changes.

Album detail shows a header placeholder and media grid while metadata is pending. Once metadata is ready, only the media grid placeholder remains until media data settles.

Media toggles update immediately. An uncached media filter starts its request after 300 ms of settled input. Query-key changes cancel obsolete media requests.
