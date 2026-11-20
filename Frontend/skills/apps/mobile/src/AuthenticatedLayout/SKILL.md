---
name: mobile-authenticatedlayout
description: "Authenticated mobile navigation."
---

# Authenticated mobile navigation

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

MobileLayout.tsx mounts presence and upload runtimes, notifications and routed content. Bottom navigation links home, gallery, locations and users. More opens profile, uploads, settings, theme and logout. Route changes close the dialog; closing restores focus.

The shared ApprovalNotice shows pending or rejected account status and provides a repeat approval request. Upload recovery runs only for active accounts.
