---
name: api-location-travel-by-id-put
description: "Current behavior of PUT /api/location/travel/{mediaId:guid}."
---

# PUT /api/location/travel/{mediaId:guid}

- Routes: `/api/location/travel/{mediaId:guid}`, `/api/media/{mediaId:guid}/location`.
- Access: Requires authentication; additional service-level permissions are described below.
- Inputs: Guid mediaId, SetMediaLocationRequest request.
- Flow: Updates or clears a media location for the owner or an administrator. Returns no content.
- Source: `Backend/Apis/Controllers/MediaController.cs` (SetLocationAsync); `Backend/Infrastructures/Data/ApplicationServices/MediaService.cs` and its partial files.
