---
name: mobile-notification-bell
description: "Mobile Home notification trigger and panel."
---

`apps/mobile/src/MobileNotificationBell.tsx` stays mounted in the authenticated header across routes. It uses `src/features/notifications/useNotificationBell.ts` for account-scoped album and upload notifications, unread counts, read actions, and item navigation. Mobile notification links use client-side navigation to retain the shell. Route changes and outside clicks close the panel. Escape closes the panel and returns focus to the bell. The panel fits within the header gutters at narrow widths.

The bell shows a small dot when the account has unread notifications. Its accessible label and tooltip announce unread items without displaying a count. Marking all items as read clears the dot.
