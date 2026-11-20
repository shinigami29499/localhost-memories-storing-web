---
name: mobile-layout
description: Mobile authenticated shell and navigation.
---

MobileLayout.tsx hosts authenticated routes, bottom navigation, and page action bars. The notification bell, More button, and floating Home, Gallery, Locations, and Users tabs remain mounted across authenticated routes. The indicator slides between the active tabs, including on browser history navigation. On secondary pages with no tab, the indicator is hidden. The active tab follows the route and uses `aria-current`.

On Home, the bordered avatar, username, and localized role come from the signed-in account and link to Profile. Leaving Home fades the name and role and crossfades the avatar into the Back button at the same position. Returning reverses the change. The hidden control is inert. Secondary pages use the destination's gradient title. More's icon morphs with the dialog. Motion follows the interface setting and system reduced motion.

The notification, More, and Back buttons share flat, borderless styling. The floating navigation has a solid surface, an even border, and soft exterior shadows in both themes. The active tab uses the page color and heavier text. The bar overlays the scroll area, so content can pass underneath it and remain visible around it. Scroll containers add bottom clearance to bring their last items above the bar. Page action bars use that same clearance to sit above the tabs.

`layout/mobilePageNavigation.tsx` records the source entry and carries Home's history index across page links, section tabs, and filter URL changes. Back and the Home tab return to that Home entry or replace the current entry with Home after a direct visit. Page links from a More destination immediately above Home replace that destination's entry, so browser Back can go directly to Home.

Mobile page navigation mounts `layout/MobilePageLoadingOverlay.tsx`. Its backdrop appears fully opaque on the first frame of the page swap. The live header and tab bar remain visible and usable above it. Stack routed content within `.mobile-page-body` to keep route styles from trapping the header below the overlay. Covered page content and page-specific actions stay inert until loading and the title handoff finish.

Bottom controls hide when an editable field is focused and the viewport shrinks for the keyboard. They return when the viewport or focus returns.

