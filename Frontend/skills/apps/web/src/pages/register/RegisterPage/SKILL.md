---
name: web-register-page
description: Web account registration and pending approval confirmation.
---

The registration page validates credentials and calls the shared registration service. On success it explains that users may sign in to view content while awaiting approval. Source: Frontend/apps/web/src/pages/register/RegisterPage.tsx.

While registration is in flight, the submit button shows busy feedback and the page rejects repeated submissions. Failure clears the pending state so users can retry.
