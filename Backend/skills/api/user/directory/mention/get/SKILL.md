---
name: api-user-directory-mention-get
description: Document GET /api/user/directory/mention.
---

# GET /api/user/directory/mention

Requires authentication. Also exposed at `/api/user-directory/mentions`. The query request supplies a username prefix. `UserService.SearchMentionCandidatesAsync` rejects blank input, trims the prefix, and requests at most eight candidates from the repository. Returns candidate DTOs and does not change state. Sources: `Apis/Controllers/UserDirectoryController.cs`, `Infrastructures/Data/ApplicationServices/UserService.cs`.

Canonical route: `/api/user/directory/mention`. Previous routes remain aliases.
