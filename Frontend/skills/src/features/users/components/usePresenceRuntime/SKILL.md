---
name: use-presence-runtime
description: Realtime presence and account-change handling.
---

The shared hook runs authenticated presence and notification transport, sends activity heartbeats, and handles account changes. Role changes and legacy disabled events use the session dialog. Approval, rejection, pause, and resume events reload the account profile into the auth store so ApprovalNotice reflects the current status. Status changes reconnect the transport so group membership reflects the new account status. Source: Frontend/src/features/users/components/usePresenceRuntime.ts.
