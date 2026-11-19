---
name: mobile-homepage
description: "Mobile home album feed."
---

# Mobile home album feed

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

MobileHomePage.tsx uses shared features/albums/hooks/useAlbums.ts and MobileAlbumFeedPost.tsx. Admins and superadmins request all albums; other users request the feed. Owners and admins receive delete controls. Initial and subsequent page failures offer retry; empty state links to albums.
