---
name: notifications-hub-presence
description: Document presence events from the authenticated notifications hub.
---

The authenticated `/hubs/notifications` hub joins clients to the presence group. `TrackActivity` persists the user's heartbeat and broadcasts `UserPresenceChanged` with the account ID, username, online flag, and UTC last-seen time.

The API process tracks connection IDs by user. Disconnecting removes the connection without ending the five-minute activity window. The HTTP heartbeat and login still publish online events through the same group.

Sources are `Apis/Realtime/NotificationsHub.cs`, `Apis/Realtime/PresenceConnections.cs`, and `Apis/Realtime/PresenceNotifications.cs`.
