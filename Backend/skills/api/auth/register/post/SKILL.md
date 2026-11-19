---
name: api-auth-register-post
description: Document account registration through POST /api/auth/register.
---

# POST /api/auth/register

- Anonymous. `RegisterRequest` validates username and password lengths and the permitted username characters.
- `Apis/Controllers/AuthController.cs` delegates to `AuthService.RegisterAsync` in `Infrastructures/Data/ApplicationServices/AuthService.cs` and returns the mapped user with HTTP 200.
- The service trims the username, rejects a name used by a non-deleted account, maps the request to a user, and saves it in a transaction. Registration creates a pending account, not a session.
- Name conflicts raise `ConflictException`. Request validation occurs before the controller action.
