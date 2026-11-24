---
name: mobile-mobileuserspage
description: Mobile user directory and administration.
---

MobileUsersPage.tsx uses shared pages/users/useUsersPage.ts. Typing in the search field is debounced 300 ms. Rejected accounts are excluded from the mobile directory and search results. Admin actions use confirmation and refresh user queries.

Active admins and super admins see square Role and Status tiles at opposite ends of one row above the bottom navigation. Each tile and option puts its label under its icon. Status options use colored dots for active, pending, and paused. The super admin option is labeled S-Admin. Role opens by default. Opening either tile widens it inward and closes the other, and one tile always remains open. The options share available width equally, to the right of Role or the left of Status. The bars animate when interface motion is enabled and the system allows motion. Each bar supports multiple selections and applies changes immediately through the shared directory filters. An empty selection leaves that dimension unrestricted.

The calendar button in the search field opens a joined-date range sheet. The sheet opens with the applied dates; selecting dates changes a draft. Done applies only the date draft. Escape, the backdrop, and a downward swipe on the header dismiss the sheet without applying changes. Focus returns to the calendar button. The sheet slides from the bottom when motion is enabled and closes immediately when reduced motion is requested or animations are disabled.

The calendar uses shared SelectField controls for month and year, hosted in the dialog. Navigation and selection are limited to 2025 through the current year. Dots mark dates, months, and years with eligible directory users, independent of the current search and date filter. Date dots appear at the top right. Calendar height changes animate when switching between months with different week counts, respecting motion preferences.

Directory rows show the avatar and recent presence beside the username. The second line shows the join date when available, followed by the role. It appends the localized Paused or Pending label after a centered dot for `disabled` or `pending_approval` accounts. Active accounts end with the role. Selecting an avatar or username opens a profile sheet. Its hero shows the avatar, username, role, and all permitted icon-only administration actions. The lower area is empty. The sheet slides from the bottom when motion is enabled and closes immediately when motion is reduced or disabled.
Join dates use two digits each for the month and day in the current language's date order.
The green dot updates from SignalR heartbeat and offline events while the directory is open. Active users with a recent last-seen value keep the existing fallback when no explicit offline event applies.
Paused uses the mobile danger color for its label and a pause icon. Pending uses the mobile warning color for its label and a clock icon. Both icons are black in light mode and white in dark mode. Each sits on a tinted circle inset 2px from the directory avatar edge, exposing the original avatar around it. Hovering over the pending avatar animates the clock hand for one turn. Disabled interface motion and reduced motion keep it static. The status text carries the same meaning for screen readers.
Profile actions use a check for approval, a pause icon for pausing, and a play icon for resuming. Pending users show a reject X instead of delete; rejection preserves the account and allows a later approval request. Admins manage users; super admins also manage admins and can change roles. Neither can manage a super admin or their own account. Actions open confirmation within the profile sheet. SuperAdmin roles display as “Super admin” in English.
Delete and Reject use a lightly tinted surface with a danger-colored icon at rest, a coral fill on hover, and a solid danger fill while pressed. The profile close button keeps its resting colors on hover and while pressed.
The Delete and Reject buttons transition their background and icon colors over 320 ms. Reduced motion and disabled app animations apply the colors immediately.
Profile action buttons use the shared IconButton button size: 40px visual circles with 20px icons and 48px hit targets.
Search navigation buttons use 40px visual boxes, 20px icons, and 48px hit targets.
When search text becomes nonempty, the calendar button slides right and fades at the end while the clear button appears. Clearing the text reverses the transition. Motion preferences make the swap immediate. The search field uses soft exterior shadows at rest and inset shadows when focused. Opening the date sheet clears input focus.

## Directory transitions

`MobileUsersPage.tsx` renders the ordered results from `useUsersPage.ts`. Its row and avatar styles live in `mobile-users.css` beside the component.

- The initial request shows avatar and text placeholders. Search and filter controls stay available. Once results appear, rows fade in with a short, capped stagger. Returning to `/user` replays the entrance after the route overlay clears.
- Search and applied filters reuse rows by visible list index. Changed usernames, join dates, roles, and status labels use Animate UI `SwappingText` within the existing row. Unchanged text stays still. The row itself stays opaque during the swap.
- The avatar column tracks users by ID. A user present in both result sets keeps their avatar visible. If their row changes, their avatar slides from the previous position to the new one over 240 ms, carrying its status and presence badges. A user entering or leaving the results fades in or out.
- Extra row slots fade in. Surplus slots fade out from bottom to top, with 60 ms between starts. Row exits and avatar movement use separate timing so a retained avatar can leave a disappearing slot without fading.
- Disabled interface motion and reduced motion apply the results immediately.

To check the transitions, filter `[A, B, C, D]` to `[B, D]`. The first two rows swap text in place. B and D slide to their new slots, A and C fade out, and the fourth row starts fading before the third. Clear the filter to check avatar entry and extra row slots. Repeat with motion disabled, then re-enter `/user` with motion enabled to check the full entrance. The mobile build passed. The browser check timed out before the rows rendered.
