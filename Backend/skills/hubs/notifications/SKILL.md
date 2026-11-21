---
name: notifications-hub-presence
description: Document presence events from the authenticated notifications hub.
---

The authenticated `/hubs/notifications` hub joins clients to the presence group. `TrackActivity` persists the user's heartbeat and broadcasts `UserPresenceChanged` with the account ID, username, online flag, and UTC last-seen time.

The API process tracks connection IDs by user. Closing the last tracked connection broadcasts an offline event with the server disconnect time. Closing one of several connections keeps the user online. The HTTP heartbeat and login still publish online events through the same group.

Sources are `Apis/Realtime/NotificationsHub.cs`, `Apis/Realtime/PresenceConnections.cs`, and `Apis/Realtime/PresenceNotifications.cs`.
