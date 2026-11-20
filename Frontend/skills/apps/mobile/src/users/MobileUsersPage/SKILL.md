---
name: mobile-mobileuserspage
description: Mobile user directory and administration.
---

MobileUsersPage.tsx uses shared pages/users/useUsersPage.ts. Search is debounced 300 ms. Role and status filters allow multiple selections. Leaving a group empty includes all eligible values. Paused status is available to admins and superadmins. Rejected accounts are excluded from the mobile directory and search results. Joined-date filters apply alongside them. Clear all resets filters. Admin actions use confirmation and refresh user queries.

The directory sits between the shared mobile header and persistent tab bar. The header owns Back and the gradient User title. Back matches the position and 40px size of the Home avatar. The filter dialog repeats the heading and Back position so Back can close the dialog. Filters sits inside the right edge of the search box. The bottom fade is decorative and lets pointer events pass through.
Role and Status can remain open together. Expanding Joined date collapses both; expanding Role or Status collapses Joined date without closing the other. Selections remain active when collapsed.
Role, status, and joined-date sections animate expansion and collapse when supported, unless app animation is off or reduced motion is requested. Unsupported browsers expand and collapse immediately.
The filter dialog blurs the directory behind it. It keeps the User title sharp and Back in its original position. Back closes the dialog and returns focus to Filters. The backdrop fades as the filter sections and footer move in, with the animations reversing on close. Each opening expands Role and collapses Status and Joined date while preserving selections. Reduced motion and disabled app animations show changes immediately.
Joined date expands to an inline calendar. Selecting dates immediately updates the joined-date range. Clear all resets the range.
The filter footer sizes Clear all to its label with 1.5rem padding on each side. Search takes the remaining width. Clear all uses the same neutral hover fill as Back.
The calendar uses shared SelectField controls for month and year, with dropdowns hosted in the filter dialog.
Month and year selectors use inset shadows when closed and soft exterior shadows when open. Dropdowns use a uniform border and soft exterior shadows. Their items appear immediately.
Hovered controls highlight all border edges at half strength; selected or open controls retain the full neutral highlight. An open month or year selector keeps its border highlighted without highlighting the dropdown container.
Joined-date calendar navigation and selection are limited to 2025 through the current year.
Calendar height changes animate when switching between months with different week counts. App animation settings and reduced motion disable this transition.

Selecting an avatar or username opens a profile sheet. Its hero shows the user's avatar, username, role, and permitted icon-only administration actions. The lower area is empty. The sheet slides from the bottom when motion is enabled and closes immediately when motion is reduced or disabled. Administration actions retain their existing confirmation and permissions.
Directory rows and profile actions use a check icon for approval and a pause icon for pausing. Pending users show a reject X instead of delete; rejection preserves the account and allows a later approval request. Admins manage users; super admins also manage admins and can change roles. Neither can manage a super admin or their own account. Row actions open the existing confirmation outside the closed profile sheet. SuperAdmin roles display as “Super admin” in English.
Directory row actions sit on the page layer. They use distinct, borderless fills and no elevation. Hover and press change the fill, and motion preferences disable optional transitions.
Delete and Reject use a tinted danger fill at rest, a coral fill on hover, and a solid danger fill with contrasting foreground while pressed. The profile close button keeps its resting colors on hover. Pause and Approve use the same 40px visual height as adjacent icon buttons.
Profile action buttons use the shared IconButton button size: 40px visual circles with 20px icons and 48px hit targets.
Row role and delete actions and the search navigation buttons use 40px visual boxes, 20px icons, and 48px hit targets.
The search field uses a uniform border and soft exterior shadows. Disabled interface motion or reduced motion removes the transition.
The search control highlights its border when the text input has focus. Opening or closing filters clears input focus; closing returns keyboard focus to the filter button without highlighting the search box.
Filter sections, selection tiles, and Search use uniform borders. Selected filters use a full neutral border highlight and keyboard focus remains visible.
Unselected role and status tiles use soft inset shadows, longer and darker at the top and shorter and lighter at the bottom. Selected tiles transition to exterior shadows with the matching blur and lengths, shorter above and longer below. Motion preferences disable the transition.
Selected tiles use a lighter surface and brighter text and icons than unselected inset tiles in both themes.
