---
name: mobile-registerpage
description: "Mobile registration."
---

# Mobile registration

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

MobileRegisterPage.tsx validates username, password and matching confirmation before calling the shared auth service. Success displays pending approval; failure displays a toast. Public settings dialog restores focus on close.
