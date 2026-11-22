---
name: api-user-get
description: Document GET /api/user.
---

# GET /api/user

Requires authentication. `UsersController.ListAsync` returns mapped users from `UserService.ListAsync`; non-admin callers have disabled users removed. The repository orders pending accounts first. This call changes no state. Sources: `Apis/Controllers/UsersController.cs` and `Infrastructures/Data/ApplicationServices/UserService.cs`.

Canonical route: `/api/user`. Previous routes remain aliases.
