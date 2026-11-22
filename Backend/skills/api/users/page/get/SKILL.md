---
name: api-users-page-get
description: Document GET /api/users/page.
---

# GET /api/users/page

Requires authentication. Accepts `page` (default 1), `limit` (default 20), `pendingOnly`, and `blockedOnly`. The controller forbids `blockedOnly` for non-admins. `UserService.GetPageAsync` validates page 1–1,000,000 and limit 1–100, then returns mapped items and pagination metadata. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.

Canonical route: `/api/user/page`. Previous routes remain aliases.
