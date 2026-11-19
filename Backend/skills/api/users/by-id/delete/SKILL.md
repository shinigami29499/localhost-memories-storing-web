---
name: api-users-by-id-delete
description: Document DELETE /api/users/{id}.
---

# DELETE /api/users/{id}

Requires admin authorization and service-level management rights. `UserService.DeleteAsync` marks the target deleted, records the actor, revokes active refresh tokens, and saves. Missing or deleted targets cause a not-found error. The controller returns HTTP 204 and attempts an admin-group notification. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.
