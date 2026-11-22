---
name: place-service
description: "Client operations for saved places and visits."
---

`src/features/place/services/placeService.ts` uses the shared authenticated API client under `/api/place` to read, create, update, and delete places and manage visits. Visit-specific routes use the singular `visit` segment. Filtering, paging, and map bounds are passed as query parameters; server permissions and validation remain authoritative.
