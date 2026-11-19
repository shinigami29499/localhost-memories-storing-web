---
name: api-auth-logout-post
description: Document refresh-token revocation through POST /api/auth/logout.
---

# POST /api/auth/logout

- Requires authentication. Accepts `LogoutRequest` and returns HTTP 204 after revocation and presence notification.
- `AuthService.LogoutAsync` hashes the supplied refresh token and revokes it only when it belongs to the caller and is not already revoked. Unknown, foreign, or previously revoked tokens are no-ops.
- `AuthController.LogoutAsync` loads the caller profile and sends an offline transition after the service call.
- Sources: `Apis/Controllers/AuthController.cs` and `Infrastructures/Data/ApplicationServices/AuthService.cs`.
