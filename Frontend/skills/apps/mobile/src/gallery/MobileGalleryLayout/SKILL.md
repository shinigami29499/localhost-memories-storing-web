---
name: mobile-mobilegallerylayout
description: "Mobile album list layout."
---

# Mobile album list layout

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

gallery/MobileGalleryLayout.tsx wraps the album list and provides a loading fallback. Gallery opens Albums directly. Legacy Favorites and Trash URLs redirect to the album list.

The outlet fallback marks the destination as pending for the shell loading overlay during a Gallery page transition.
