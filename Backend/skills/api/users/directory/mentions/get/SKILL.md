---
name: api-users-directory-mentions-get
description: Document GET /api/users/directory/mentions.
---

# GET /api/users/directory/mentions

Requires authentication. Also exposed at `/api/user-directory/mentions`. The query request supplies a username prefix. `UserService.SearchMentionCandidatesAsync` rejects blank input, trims the prefix, and requests at most eight candidates from the repository. Returns candidate DTOs and does not change state. Sources: `Apis/Controllers/UserDirectoryController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.
