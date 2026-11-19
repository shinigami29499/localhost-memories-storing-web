---
name: mobile-mobileuserspage
description: Mobile user directory and administration.
---

MobileUsersPage.tsx uses shared pages/users/useUsersPage.ts. Search is debounced 300 ms. Role and status filters allow multiple selections; none selected includes all available values. Blocked status is available to admins and superadmins. Joined-date filters apply alongside them. Clear all resets filters. Admin actions use confirmation and refresh user queries.

The directory fills the mobile view without bottom navigation. Its bottom-left back button opens the home feed. Admin and superadmin users see a centered add button that shows an informational work-in-progress toast; it does not create users.
Role, status, and joined-date cards form one exclusive group: opening one collapses the others. Selections remain active when collapsed.
Role, status, and joined-date sections animate expansion and collapse when supported, unless app animation is off or reduced motion is requested. Unsupported browsers expand and collapse immediately.
The advanced filter dialog fades in and out when motion is enabled and the browser supports dialog transitions. Reduced motion and disabled app animations show changes immediately.
Joined date expands to an inline calendar. Selecting dates immediately updates the joined-date range. Clear all resets the range.
The calendar uses shared SelectField controls for month and year, with dropdowns hosted in the filter dialog.
Joined-date calendar navigation and selection are limited to 2025 through the current year.
Calendar height changes animate when switching between months with different week counts. App animation settings and reduced motion disable this transition.
