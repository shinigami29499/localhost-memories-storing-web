---
name: mobile-mobilegallerylayout
description: "Mobile album list layout."
---

# Mobile album list layout

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

gallery/MobileGalleryLayout.tsx wraps the album list at `/album`. Legacy Gallery, Favorites, and Trash URLs redirect to the album list; legacy album-detail URLs redirect to `/album/{albumId}`.

The mobile shell owns the route-module loader. Album list data loading uses its own frame placeholders.
