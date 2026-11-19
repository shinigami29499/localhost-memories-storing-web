---
name: api-users-me-get
description: Document GET /api/users/me.
---

# GET /api/users/me

Requires authentication. `UsersController.GetProfileAsync` passes the caller ID to `UserService.GetProfileAsync`, which returns a mapped user or a not-found error for a missing or deleted account. No state changes. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.
