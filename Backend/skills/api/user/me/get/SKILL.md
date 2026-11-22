---
name: api-user-me-get
description: Document GET /api/user/me.
---

# GET /api/user/me

Requires authentication. `UsersController.GetProfileAsync` passes the caller ID to `UserService.GetProfileAsync`, which returns a mapped user or a not-found error for a missing or deleted account. No state changes. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.

Canonical route: `/api/user/me`. Previous routes remain aliases.
