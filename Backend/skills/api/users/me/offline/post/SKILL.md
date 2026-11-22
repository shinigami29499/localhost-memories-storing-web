---
name: api-users-me-offline-post
description: Document POST /api/users/me/offline.
---

# POST /api/users/me/offline

Requires authentication. The controller loads the caller profile and broadcasts an offline presence transition using its last-seen timestamp, or UTC now when absent. It returns HTTP 204 and does not update last-seen state. A missing or deleted user causes a not-found error. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.

Canonical route: `/api/user/me/offline`. Previous routes remain aliases.
