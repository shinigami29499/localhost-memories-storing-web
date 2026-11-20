---
name: api-users-by-id-reject-post
description: Reject a pending account without deleting it.
---

Requires active admin authorization and the same management permissions as approval. Only pending accounts can be rejected. Changes status to rejected, saves it, notifies the target through AccountChanged, and refreshes admin user lists. Rejected accounts can sign in and view content, but cannot modify it until approval. Sources: Apis/Controllers/UsersController.cs and Infrastructures/Data/ApplicationServices/UserService.cs.

Approval and rejection transitions lock the target account in a transaction. The API checks the current status for each authenticated request. Pending, rejected, and paused accounts can use read methods and the explicitly allowed operational requests; other writes are forbidden. The notifications hub may only expose view-safe methods to these accounts.
