---
name: mobile-loginpage
description: "Mobile sign-in."
---

# Mobile sign-in

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

MobileLoginPage.tsx sends trimmed username and password through the shared auth service. Success stores the session and navigates home with login toast state. Failure displays a toast and clears busy state. Entry consumes any pending logout toast.
