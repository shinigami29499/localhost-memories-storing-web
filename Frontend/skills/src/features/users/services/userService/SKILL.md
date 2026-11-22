---
name: user-service
description: "Client operations for user profiles and administration."
---

`src/features/users/services/userService.ts` uses the authenticated API client under `/api/user` for profiles, presence, approval, and administration. The backend enforces account status and administrator permissions. Legacy `/api/users` routes remain available.
