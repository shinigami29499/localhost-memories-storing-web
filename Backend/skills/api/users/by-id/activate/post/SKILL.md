---
name: api-users-by-id-activate-post
description: Document POST /api/users/{id}/activate.
---

# POST /api/users/{id}/activate

Requires admin authorization and service-level management rights. `UserService.ActivateAsync` changes a disabled account to active; other states cause a conflict. The controller returns the user and attempts an admin-group notification. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.
