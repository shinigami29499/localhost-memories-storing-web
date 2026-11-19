---
name: api-auth-me-get
description: Document current claims through GET /api/auth/me.
---

# GET /api/auth/me

- Requires authentication. `AuthController.Me` returns HTTP 200 with `id`, `username`, and `isAdmin` from the current user context.
- This endpoint does not query or update a user profile. Source: `Apis/Controllers/AuthController.cs`.
