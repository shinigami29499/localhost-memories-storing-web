---
name: api-user-me-password-put
description: Document PUT /api/user/me/password.
---

# PUT /api/user/me/password

Requires authentication. `ChangePasswordRequest` supplies current and new passwords. `UserService.ChangePasswordAsync` checks the caller exists and is not deleted, compares the current password, and saves the new value. An incorrect current password raises a validation error. The controller returns HTTP 204. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`, `Services/Requests/Users/ChangePasswordRequest.cs`.

Canonical route: `/api/user/me/password`. Previous routes remain aliases.
