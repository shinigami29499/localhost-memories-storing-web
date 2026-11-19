---
name: mobile-mobilegallerypage
description: "Mobile gallery and favorites."
---

# Mobile gallery and favorites

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

gallery/MobileGalleryPage.tsx delegates to shared pages/gallery/useGalleryPage.tsx. It displays grouped paginated media, previews, filters, selection, uploads, favorites and save-to-album actions. Favorite changes support undo. Deletion moves media to trash. Unavailable-media removal refreshes media, album and place queries.
