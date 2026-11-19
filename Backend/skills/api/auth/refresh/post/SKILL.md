---
name: api-auth-refresh-post
description: Document refresh-token rotation through POST /api/auth/refresh.
---

# POST /api/auth/refresh

- Anonymous. Accepts `RefreshTokenRequest`; returns a new access token, refresh token, and user.
- `AuthService.RefreshAsync` hashes and finds the token, locks its user, reloads the token, and checks the active account and session. A replaced session raises `SessionReplacedException`.
- An inactive token causes all active refresh tokens for that user to be revoked and committed before an unauthorized error. An active token is revoked and a successor is persisted in the same transaction.
- Sources: `Apis/Controllers/AuthController.cs` and `Infrastructures/Data/ApplicationServices/AuthService.cs`.
