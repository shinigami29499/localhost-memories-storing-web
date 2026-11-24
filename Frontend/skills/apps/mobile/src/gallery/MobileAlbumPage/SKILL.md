---
name: mobile-mobilealbumpage
description: "Mobile album detail."
---

# Mobile album detail

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

`gallery/MobileAlbumPage.tsx` uses the route album ID and shared `useAlbum` query. It shows the title, localized visibility and owner's username, image carousel, and image and video count tags. A placeholder covers pending metadata. Missing albums show the empty state and other failures offer retry.

Mobile detail omits the caption, upload control, media grid, and grid actions. The carousel starts with the first album image, independent of the album cover.
