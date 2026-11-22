---
name: api-user-by-id-role-put
description: Document PUT /api/user/{id}/role.
---

# PUT /api/user/{id}/role

Requires admin authorization and an active super admin actor. Self-role changes and roles other than `admin` or `user` cause conflicts; super admin targets cannot be managed. `UserService.UpdateRoleAsync` saves a changed role and revokes active refresh tokens; an unchanged role is a no-op. The controller returns the user, notifies the target when the role changed, and notifies the admin group. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.

Canonical route: `/api/user/{id}/role`. Previous routes remain aliases.
