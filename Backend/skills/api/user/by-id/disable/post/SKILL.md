---
name: api-user-by-id-disable-post
description: Document POST /api/user/{id}/disable.
---

# POST /api/user/{id}/disable

Requires active admin authorization and service-level management rights. Self-pause is rejected. `UserService.DisableAsync` locks an active target and marks the account disabled (paused) in a transaction. Existing sessions remain valid but API requests become view-only, like pending accounts. The controller returns the user and sends account-change and admin-group notifications. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.

Canonical route: `/api/user/{id}/disable`. Previous routes remain aliases.
