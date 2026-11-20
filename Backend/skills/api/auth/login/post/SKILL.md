---
name: api-auth-login-post
description: Document session creation through POST /api/auth/login.
---

# POST /api/auth/login

- Anonymous. `LoginRequest` supplies username and password; `AuthController.LoginAsync` returns an `AuthResponse` containing access token, refresh token, and user.
- `AuthService.LoginAsync` trims the username and checks credentials and status. Active, pending, rejected, and paused accounts can sign in. Pending, rejected, and paused accounts are restricted to view-only API access. Invalid credentials are unauthorized.
- Under a user lock and transaction, it rechecks status, revokes active refresh tokens, replaces the session ID, and issues a token pair. A later login replaces the earlier session.
- The controller sends `SessionChanged` and presence notifications after login. A failure sending `SessionChanged` is logged.
- Sources: `Apis/Controllers/AuthController.cs`, `Infrastructures/Data/ApplicationServices/AuthService.cs`, and `Services/Requests/Auth/LoginRequest.cs`.
