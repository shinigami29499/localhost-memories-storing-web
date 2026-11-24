---
name: use-presence-runtime
description: Realtime presence and account-change handling.
---

The shared hook runs authenticated presence and notification transport, sends activity heartbeats, and handles account changes. Role changes and legacy disabled events use the session dialog. Approval, rejection, pause, and resume events reload the account profile into the auth store so ApprovalNotice reflects the current status. Status changes reconnect the transport so group membership reflects the new account status. Source: Frontend/src/features/users/components/usePresenceRuntime.ts.

SignalR presence events update the in-memory presence store with the reported online state and timestamp. The Users directory combines that state with its fetched list and uses the newest last-seen value. Pointer and keyboard actions send a heartbeat while the app is visible. Reconnecting refreshes the Users queries. Presence changes do not show online or offline toasts.

Album media changes refresh album, media, place, and picker queries. A payload-free removal event refreshes shared file references without exposing private album details.

Album notifications open `/album/{albumId}`; upload notifications open `/album`. Album-list refresh and account actions follow those canonical routes.
