---
name: approval-notice
description: Account approval status and repeat request notice.
---

ApprovalNotice reads the authenticated user from the shared auth store, refreshes its profile on mount and visibility return, and appears in mobile and web layouts for pending, rejected, and paused users. Pending and paused accounts see a view-only notice. Rejected accounts can request approval again; success updates the session user to pending, and failure is shown inline. AccountChanged events refresh the user while connected. Sources: Frontend/src/features/users/components/ApprovalNotice.tsx, userService.ts, and usePresenceRuntime.ts.
