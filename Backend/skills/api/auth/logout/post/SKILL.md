---
name: api-auth-logout-post
description: Document refresh-token revocation through POST /api/auth/logout.
---

# POST /api/auth/logout

- Requires authentication. Accepts `LogoutRequest` and returns HTTP 204.
- `AuthService.LogoutAsync` hashes the supplied refresh token and revokes it only when it belongs to the caller and is not already revoked. Unknown, foreign, or previously revoked tokens are no-ops.
- `AuthController.LogoutAsync` broadcasts offline presence after revocation if the API process tracks at most one SignalR connection for the user. With multiple tracked connections, the hub reports offline when the last one closes.
- Sources: `Apis/Controllers/AuthController.cs`, `Apis/Realtime/PresenceConnections.cs`, and `Infrastructures/Data/ApplicationServices/AuthService.cs`.
