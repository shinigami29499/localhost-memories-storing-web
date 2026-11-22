---
name: api-user-me-request-approval-post
description: Request approval again after rejection.
---

# POST /api/user/me/request-approval

Requires an authenticated rejected account. Changes its status to pending_approval and notifies the admin group. Other statuses produce a conflict. Pending accounts remain view-only until approved. Sources: Apis/Controllers/UsersController.cs and Infrastructures/Data/ApplicationServices/UserService.cs.

The transition locks the account in a transaction to serialize it with approval and rejection.

Canonical route: `/api/user/me/request-approval`. Previous routes remain aliases.
