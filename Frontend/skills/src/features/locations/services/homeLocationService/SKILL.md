---
name: home-location-service
description: "Client operations for the caller's home location."
---

`src/features/locations/services/homeLocationService.ts` reads, updates, or clears the authenticated caller's home coordinates through `/api/place/home-location`. The backend validates coordinates and handles optional assignment to unlocated photos.
