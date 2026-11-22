---
name: api-previews-by-id-get
description: Document preview lookup through GET /api/previews/{id}.
---

# GET /api/previews/{id}

- Requires authentication and a GUID media ID. Returns a media DTO when the image is selectable by the caller.
- `PreviewService.GetImageAsync` checks selection visibility and existence; either failure returns a not-found error. It does not modify the image.
- Sources: `Apis/Controllers/PreviewsController.cs` and `Infrastructures/Data/ApplicationServices/PreviewService.cs`.

Canonical route: `/api/preview/{id}`. Previous routes remain aliases.
