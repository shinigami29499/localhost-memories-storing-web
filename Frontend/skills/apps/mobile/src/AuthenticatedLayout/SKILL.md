---
name: mobile-authenticatedlayout
description: "Authenticated mobile navigation."
---

# Authenticated mobile navigation

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

MobileLayout.tsx mounts presence and upload runtimes and routed content. The notification bell, More button, and four primary tabs stay in the authenticated shell across routes and loading. Home's avatar, username, and role link to Profile. The primary tabs have no header Back button. Album detail returns to Gallery. The [More sheet](../MobileLayout/SKILL.md) provides profile, uploads, settings, and logout. A routed selection closes the sheet and opens with the same fade as the main navigation. Back from a More page and the Home tab return to Home.

The shared ApprovalNotice shows pending or rejected account status and provides a repeat approval request. Upload recovery runs only for active accounts.
