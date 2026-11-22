---
name: api-users-me-home-location-put
description: Document PUT /api/users/me/home-location and location aliases.
---

# PUT /api/users/me/home-location

Requires authentication. Also exposed at `/api/location/home-location`, `/api/location/place/home-location`, and `/api/location/food/home-location`. `UserService.SetHomeLocationAsync` validates finite latitude and longitude within geographic bounds, verifies the caller, and saves shared coordinates. With `ApplyToUnlocatedPhotos`, coordinates must match the current home or a conflict occurs; saving and assigning the caller's unlocated media run in one transaction. Returns the coordinates. Sources: `Apis/Controllers/UsersController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.

Canonical route: `/api/user/me/home-location`. Previous routes remain aliases.
