---
name: web-users-page
description: Web user directory and administrator controls.
---

The web user directory uses useUsersPage for data, filters, and confirmations. User management and role-change controls require an active administrator. Pending and rejected users are view-only. Sources: Frontend/apps/web/src/pages/users/UsersPage.tsx and Frontend/src/pages/users/useUsersPage.ts.

The shared page hook combines fetched users with live SignalR presence. Explicit offline events clear the online indicator immediately; last-seen age remains the fallback.

The directory shows avatar and text rows while its initial result is pending.
