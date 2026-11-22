---
name: api-users-me-avatar-put
description: Document PUT /api/users/me/avatar.
---

# PUT /api/users/me/avatar

Requires authentication. `SetAvatarRequest.Seed` must be nonblank and at most 128 characters. `UserService.SetAvatarAsync` checks the caller exists, saves the trimmed seed, and returns the mapped user. Invalid seeds cause validation errors; missing or deleted users cause not-found errors. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.

Canonical route: `/api/user/me/avatar`. Previous routes remain aliases.
