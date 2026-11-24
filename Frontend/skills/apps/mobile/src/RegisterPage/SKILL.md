---
name: mobile-registerpage
description: "Mobile registration."
---

# Mobile registration

Sources below are relative to `Frontend/apps/mobile/src/` unless marked shared, which is relative to `Frontend/src/`.

MobileRegisterPage.tsx validates username, password and matching confirmation before calling the shared auth service. Success explains that a pending account can sign in to view content but needs approval to make changes; failure displays a toast. Public settings dialog restores focus on close.

While registration is in flight, the submit button shows busy feedback and the page rejects repeated submissions. Failure clears the pending state so users can retry.
