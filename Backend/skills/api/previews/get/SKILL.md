---
name: api-previews-get
description: Document selectable preview listing through GET /api/previews.
---

# GET /api/previews

- Requires authentication. Query parameters `offset` and `limit` default to 0 and 48.
- `PreviewService.ListAsync` validates offset >= 0 and limit 1–100, counts and lists images selectable by the current viewer, and returns a paged media response.
- Invalid pagination raises a validation error. Sources: `Apis/Controllers/PreviewsController.cs`, `Infrastructures/Data/ApplicationServices/PreviewService.cs`, and the preview repository.

Canonical route: `/api/preview`. Previous routes remain aliases.
