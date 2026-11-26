---
name: mobile-mobilealbumpage
description: "Mobile album detail."
---

# Mobile album detail

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

`gallery/MobileAlbumPage.tsx` uses the route album ID and shared `useAlbum` query. It shows the title, localized visibility and owner's username, media carousel, and image and video count tags. A placeholder covers pending metadata. Missing albums show the empty state and other failures offer retry.

Active users can upload to public albums and to private albums they own. The page registers Add media with the shell and opens a file picker that accepts multiple images and videos. `useAlbumUpload` queues files for concurrent direct upload. The Upload page at /upload tracks transfers and provides cancellation, retry, and restart. The runtime refreshes album and media data when storage is confirmed.

The carousel starts with the first album media item, independent of the cover. Known image and video counts let the carousel skip the request for an empty album. Mobile detail shows the carousel and counts. It leaves the caption and media grid to other views.
