---
name: mobile-mobiletrashpage
description: "Mobile trash actions."
---

# Mobile trash actions

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

trash/MobileTrashPage.tsx uses shared pages/gallery/useTrashPage.ts; its route requires admin or superadmin. Deleted media can be filtered, previewed, selected, restored or permanently deleted with confirmation. Restoration offers undo; actions invalidate media queries.
