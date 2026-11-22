---
name: api-users-by-id-approve-post
description: Document POST /api/users/{id}/approve.
---

# POST /api/users/{id}/approve

Requires admin authorization. `UserService.ApproveAsync` checks target existence and management rights, then changes only a pending account to active. Other states cause a conflict. An active admin may manage users; a super admin may manage admins and users, but no one may manage a super admin. Returns the user and notifies the admin group of changes; notification failures are logged. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.

Approval also sends the target an account-change event so the client refreshes its status. Active status allows modification requests.

Canonical route: `/api/user/{id}/approve`. Previous routes remain aliases.
