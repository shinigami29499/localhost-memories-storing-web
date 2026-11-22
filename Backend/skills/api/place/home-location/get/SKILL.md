---
name: api-place-home-location-get
description: Document GET /api/place/home-location and location aliases.
---

# GET /api/place/home-location

Requires authentication. Also exposed at `/api/location/home-location`, `/api/location/place/home-location`, and `/api/location/food/home-location`. `UserService.GetHomeLocationAsync` verifies the caller and returns the shared home coordinates, or null when either coordinate is absent. Source: `Infrastructures/Data/ApplicationServices/UserService.cs`; routes: `Apis/Controllers/UsersController.cs`.

Canonical route: `/api/place/home-location`. Previous routes remain aliases.
