---
name: mobile-mobileuserspage
description: Mobile user directory and administration.
---

MobileUsersPage.tsx uses shared pages/users/useUsersPage.ts. Typing in the search field is debounced 300 ms. Role and status filters allow multiple selections. Leaving a group empty includes all eligible values. Paused status is available to admins and superadmins. Rejected accounts are excluded from the mobile directory and search results. Admin actions use confirmation and refresh user queries.

The directory sits between the shared mobile header and persistent tab bar. The header shows the gradient User title. The filter dialog repeats the title and adds a 40px Back button to close the dialog. Filters sits inside the right edge of the search box. The bottom fade is decorative and lets pointer events pass through.
The shared directory hook redirects non-admins from `/user/blocked` to `/user`.
Role and Status can remain open together. Expanding Joined date collapses both; expanding Role or Status collapses Joined date without closing the other. Selections remain active when collapsed.
Role, status, and joined-date sections animate expansion and collapse when supported, unless app animation is off or reduced motion is requested. Unsupported browsers expand and collapse immediately.
The filter dialog blurs the directory behind it. It keeps the User title sharp and Back in its original position. Back closes the dialog and returns focus to Filters. The backdrop fades as the filter sections and footer move in, with the animations reversing on close. Each opening expands Role and collapses Status and Joined date while preserving selections. Reduced motion and disabled app animations show changes immediately.
Joined date expands to an inline calendar. The dialog starts with the applied filters. Role, status, and joined-date edits update the draft. Clear all resets the draft. Search applies the draft to the directory and closes the dialog. Back and Escape leave the applied filters in place.
Clicking, tapping, or swiping up in the blank area below the filter sections closes the dialog and leaves the applied filters in place. The side gutters sit outside the dismissal area. Swiping inside the filter sections scrolls the content on short screens.
The filter footer sizes Clear all to its label with 1.5rem padding on each side. Search takes the remaining width. Clear all uses the same neutral hover fill as Back.
The calendar uses shared SelectField controls for month and year, with dropdowns hosted in the filter dialog.
Closed month and year selectors use inset shadows and a contrasting border. Open selectors and dropdowns use exterior shadows and borders that match their fill at rest. Dropdown items appear immediately.
Hover highlights interactive borders. Keyboard focus remains visible in either depth state.
Joined-date calendar navigation and selection are limited to 2025 through the current year.
Calendar height changes animate when switching between months with different week counts. App animation settings and reduced motion disable this transition.

Directory rows show the avatar and recent presence beside the username. The second line shows the join date when available, followed by the role. It appends the localized Paused or Pending label after a centered dot for `disabled` or `pending_approval` accounts. Active accounts end with the role. Selecting an avatar or username opens a profile sheet. Its hero shows the avatar, username, role, and all permitted icon-only administration actions. The lower area is empty. The sheet slides from the bottom when motion is enabled and closes immediately when motion is reduced or disabled.
Join dates use two digits each for the month and day in the current language's date order.
The green dot updates from SignalR heartbeat and offline events while the directory is open. Active users with a recent last-seen value keep the existing fallback when no explicit offline event applies.
Paused uses the mobile danger color for its label and a pause icon. Pending uses the mobile warning color for its label and a clock icon. Both icons are black in light mode and white in dark mode. Each sits on a tinted circle inset 2px from the directory avatar edge, exposing the original avatar around it. Hovering over the pending avatar animates the clock hand for one turn. Disabled interface motion and reduced motion keep it static. The status text carries the same meaning for screen readers.
Profile actions use a check for approval, a pause icon for pausing, and a play icon for resuming. Pending users show a reject X instead of delete; rejection preserves the account and allows a later approval request. Admins manage users; super admins also manage admins and can change roles. Neither can manage a super admin or their own account. Actions open confirmation within the profile sheet. SuperAdmin roles display as “Super admin” in English.
Delete and Reject use a lightly tinted surface with a danger-colored icon at rest, a coral fill on hover, and a solid danger fill while pressed. The profile close button keeps its resting colors on hover and while pressed.
The Delete and Reject buttons transition their background and icon colors over 320 ms. Reduced motion and disabled app animations apply the colors immediately.
Profile action buttons use the shared IconButton button size: 40px visual circles with 20px icons and 48px hit targets.
Search navigation buttons use 40px visual boxes, 20px icons, and 48px hit targets.
The search field uses soft exterior shadows at rest. It switches to inset shadows and a highlighted border when the text input has focus. Opening or closing filters clears input focus. Closing returns keyboard focus to the Filters button. Disabled interface motion or reduced motion removes the transition.
Filter sections and the Search action use exterior shadows. The search field, panels, Search action, and selected role and status tiles match their borders to their fill at rest. Inset tiles keep a contrasting border.
Unselected role and status tiles use soft inset shadows, longer and darker at the top and shorter and lighter at the bottom. Selected tiles transition to exterior shadows with the matching blur and lengths, shorter above and longer below. Motion preferences disable the transition.
The resting search box, filter panels, open calendar controls, and profile sheet use the shared raised fill. Selected role and status tiles use a white fill and dark text in dark mode, and a dark fill and white text in light mode. In dark mode, unchecked tiles use the page background.

The directory shows avatar and text row placeholders while its initial request is pending. Search and filter controls remain available.
