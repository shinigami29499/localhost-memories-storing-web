---
name: users-page-controller
description: Shared user directory data, filtering, and administration.
---

`Frontend/src/pages/users/useUsersPage.ts` supplies the web and mobile directories. Desktop search waits for the shared search debounce before selecting and filtering the user list. Mobile supplies its already-debounced search from `MobileUsersPage`. Role, status, and date filters operate on the fetched list, while unfiltered desktop views use paginated data. The list query forwards its cancellation signal to `userService`. Admin actions invalidate user queries, and presence updates augment the displayed users.
