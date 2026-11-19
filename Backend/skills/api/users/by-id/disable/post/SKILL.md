---
name: api-users-by-id-disable-post
description: Document POST /api/users/{id}/disable.
---

# POST /api/users/{id}/disable

Requires admin authorization and service-level management rights. Self-disable is rejected. `UserService.DisableAsync` accepts only active targets, marks the account disabled, revokes its active refresh tokens, and saves. The controller returns the user and attempts account-change and admin-group notifications. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.
