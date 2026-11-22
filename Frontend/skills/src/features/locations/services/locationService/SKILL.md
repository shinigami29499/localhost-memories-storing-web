---
name: location-service
description: "Client operations for travel media locations."
---

`src/features/locations/services/locationService.ts` uses `/api/place/travel` to page located or unlocated media, set or clear photo coordinates, and request scans. The authenticated API client handles errors and token refresh; server-side ownership and administrator checks apply.
