---
name: mobile-homepage
description: "Protected mobile Home and its empty content area."
---

# Mobile Home

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

`App.tsx` routes authenticated users at `/` to `MobileHomePage.tsx`. Home renders an empty main landmark and makes no album requests. The authenticated shell supplies the account header and bottom navigation. See the [MobileLayout skill](../MobileLayout/SKILL.md).
