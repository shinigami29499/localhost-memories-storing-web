---
name: api-place-home-location-delete
description: Document DELETE /api/place/home-location and location aliases.
---

# DELETE /api/place/home-location

Requires authentication. Also exposed at `/api/location/home-location`, `/api/location/place/home-location`, and `/api/location/food/home-location`. `UserService.ClearHomeLocationAsync` verifies the caller, clears both shared coordinates, and saves. Returns HTTP 204. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.

Canonical route: `/api/place/home-location`. Previous routes remain aliases.
