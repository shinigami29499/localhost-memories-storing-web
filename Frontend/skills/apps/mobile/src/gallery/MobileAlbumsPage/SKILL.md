---
name: mobile-mobilealbumspage
description: "Mobile album list."
---

# Mobile album list

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

gallery/MobileAlbumsPage.tsx delegates to shared pages/albums/useAlbumsPage.ts. Users can search, paginate, create and select albums. Owners can edit; selection supports bulk deletion. Writes use the shared album service and invalidate album queries.
