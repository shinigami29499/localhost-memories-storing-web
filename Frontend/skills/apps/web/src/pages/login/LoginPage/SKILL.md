---
name: web-login-page
description: Web sign-in flow and submission state.
---

`Frontend/apps/web/src/pages/login/LoginPage.tsx` sends a trimmed username and password through the shared authentication service. Success stores the session and navigates home with toast state. Failure displays a toast. The page shows immediate busy feedback and rejects repeated submissions until the request settles.
