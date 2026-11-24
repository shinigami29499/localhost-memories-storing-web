---
name: web-album-page
description: "Album media management on the web."
---

The web album detail page uses Frontend/src/pages/albums/useAlbumDetail.ts. Owners queue selected images and videos into the current album. They can confirm permanent removal of selected media. Deletion refreshes album, media, and place queries. Viewers can browse and favorite media.

The album header and media grid use separate loading placeholders. The media grid keeps its placeholder until the media query settles.

Media toggles update immediately. An uncached media filter starts its request after 300 ms of settled input. Query-key changes cancel obsolete media requests.
