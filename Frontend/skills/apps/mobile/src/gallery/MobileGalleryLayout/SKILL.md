---
name: mobile-mobilegallerylayout
description: "Mobile gallery navigation."
---

# Mobile gallery navigation

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

gallery/MobileGalleryLayout.tsx links gallery and albums, adding trash for admins and superadmins. Favorites shares gallery highlight. Outlet uses suspense and push transitions; indicator motion respects animation settings and reduced motion.

The outlet fallback marks the destination as pending for the shell loading overlay during a Gallery page transition.
