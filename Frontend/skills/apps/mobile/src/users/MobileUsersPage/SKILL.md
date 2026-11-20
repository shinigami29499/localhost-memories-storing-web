---
name: mobile-mobileuserspage
description: Mobile user directory and administration.
---

MobileUsersPage.tsx uses shared pages/users/useUsersPage.ts. Search is debounced 300 ms. Role and status filters allow multiple selections; none selected includes all available values. Blocked status is available to admins and superadmins. Joined-date filters apply alongside them. Clear all resets filters. Admin actions use confirmation and refresh user queries.

The directory fills the mobile view without bottom navigation. Its bottom-left back button opens the home feed. Admin and superadmin users see a centered add button that shows an informational work-in-progress toast; it does not create users.
Role and Status can remain open together. Expanding Joined date collapses both; expanding Role or Status collapses Joined date without closing the other. Selections remain active when collapsed.
Role, status, and joined-date sections animate expansion and collapse when supported, unless app animation is off or reduced motion is requested. Unsupported browsers expand and collapse immediately.
The advanced filter background and modal backdrop fade in with the content and finish fading out 100 ms before the content opacity; which then settles downward from a short offset; its footer buttons enter separately from below. These animations reverse on close when supported. Each opening expands Role and collapses Status and Joined date; filter selections remain unchanged. Reduced motion and disabled app animations show changes immediately.
Joined date expands to an inline calendar. Selecting dates immediately updates the joined-date range. Clear all resets the range.
The calendar uses shared SelectField controls for month and year, with dropdowns hosted in the filter dialog.
Month and year selectors use inset shadows when closed and raised shadows when open. Dropdowns use the dialog's directional border and shadow; their items appear immediately without staggered blur or scroll fading.
Hovered controls highlight all border edges at half strength; selected or open controls retain the full neutral highlight. An open month or year selector keeps its border highlighted without highlighting the dropdown container.
Joined-date calendar navigation and selection are limited to 2025 through the current year.
Calendar height changes animate when switching between months with different week counts. App animation settings and reduced motion disable this transition.

Selecting an avatar or username opens a profile sheet. Its hero shows the user's avatar, username, role, and permitted icon-only administration actions. The lower area is empty. The sheet slides from the bottom when motion is enabled and closes immediately when motion is reduced or disabled. Administration actions retain their existing confirmation and permissions.
Directory rows and profile actions use a check icon for approval and a pause icon for pausing. Pending users show a reject X instead of delete; rejection preserves the account and allows a later approval request. Admins manage users; super admins also manage admins and can change roles. Neither can manage a super admin or their own account. Row actions open the existing confirmation outside the closed profile sheet. SuperAdmin roles display as “Super admin” in English.
Row actions use half-strength hover borders and full-strength pressed borders, with shadows fading on press. Destructive actions retain their danger palette. Motion preferences disable optional transitions.
The row Delete or Reject button uses the pale danger palette and transitions to the solid danger surface with contrasting foreground while pressed. The profile action keeps the solid danger palette. Pause and Approve use the same 40px visual height as adjacent icon buttons.
Profile action buttons use the shared IconButton button size: 40px visual circles with 20px icons and 48px hit targets.
Row role and delete actions use 40px visual boxes, 20px icons, and 48px hit targets. The bottom back and add actions use 56px boxes with 24px icons.
The search control and bottom back/add buttons use a brighter top border of equal thickness, darker remaining borders, and black directional shadows, shorter above and longer below. Hover highlights the border and adds a top-lit gradient. Pressing gradually removes the shadow and brightens the circle button borders to their maximum. Disabled interface motion or reduced motion removes the transition.
The search control highlights its border when the text input has focus. Opening or closing filters clears input focus; closing returns keyboard focus to the filter button without highlighting the search box.
The filter dialog applies directional lighting to its close button, filter sections, selection tiles, and Search button. Selected filters use a full neutral border highlight and keyboard focus remains visible.
Unselected role and status tiles use inset shadows, longer at the top and shorter at the bottom. Selected tiles transition to outer shadows, with a shorter shadow above and a longer shadow below. Motion preferences disable the transition.
Selected tiles use a lighter surface and brighter text and icons than unselected inset tiles in both themes.
The bottom back/add buttons are hidden while the search input has focus, preventing them from moving above the on-screen keyboard. They return when the input loses focus.
