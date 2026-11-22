---
name: api-user-by-id-activate-post
description: Document POST /api/user/{id}/activate.
---

# POST /api/user/{id}/activate

Requires active admin authorization and service-level management rights. `UserService.ActivateAsync` locks and changes a paused account to active; other states cause a conflict. The controller returns the user and notifies the account and admin group. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.

Canonical route: `/api/user/{id}/activate`. Previous routes remain aliases.
