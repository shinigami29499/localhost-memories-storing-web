---
name: api-users-me-heartbeat-post
description: Document POST /api/users/me/heartbeat.
---

# POST /api/users/me/heartbeat

Requires authentication. `UserService.HeartbeatAsync` requires an active, non-deleted caller, persists `LastSeenAt` as UTC now, and returns it. The controller broadcasts an online presence transition and returns `{ lastSeenAt }`. Missing or inactive users cause a not-found error. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.
