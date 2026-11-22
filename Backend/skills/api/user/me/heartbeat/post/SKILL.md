---
name: api-user-me-heartbeat-post
description: Document POST /api/user/me/heartbeat.
---

# POST /api/user/me/heartbeat

Requires authentication. `UserService.HeartbeatAsync` accepts active, pending, rejected, or paused non-deleted callers, persists `LastSeenAt` as UTC now, and returns it. The controller broadcasts an online presence transition and returns `{ lastSeenAt }`. Missing users cause a not-found error. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.

Canonical route: `/api/user/me/heartbeat`. Previous routes remain aliases.
