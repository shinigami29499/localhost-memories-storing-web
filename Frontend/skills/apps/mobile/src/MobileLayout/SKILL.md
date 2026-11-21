---
name: mobile-layout
description: Mobile authenticated shell and navigation.
---

MobileLayout.tsx hosts authenticated routes, bottom navigation, and page action bars. The notification bell, More button, and floating Home, Gallery, Locations, and Users tabs remain mounted across authenticated routes. The indicator slides between the active tabs, including on browser history navigation. On secondary pages with no tab, the indicator is hidden. The active tab follows the route and uses `aria-current`.

On Home, the bordered avatar, username, and localized role come from the signed-in account and link to Profile. Gallery, Locations, and Users start their titles at the leading gutter. The header Back button stays inert on all primary tabs. On opening album detail from Gallery, the Gallery title slides right before Back fades and slides in. Returning to Gallery fades and slides Back out before the title slides left. More pages keep their gradient title and Back button. More's icon morphs with the dialog. Motion follows the interface setting and system reduced motion.

The More button opens a modal bottom sheet with User profile, Upload, Settings, and Log out. The sheet slides up when opened and down when dismissed. Tapping the backdrop or pressing Escape closes it and returns focus to the More button. Selecting a destination closes the sheet before navigation. Log out closes it and calls the shared logout hook. Appearance controls live on the Settings page.

The shell and its page-loading overlay share the mobile theme background. The notification, More, and Back buttons share flat, borderless styling. In dark mode, the notification and More buttons use the raised fill to stand out against the header. The floating navigation, More sheet, and notification panel use the shared raised fill, which is `#303030` in dark mode. The floating navigation retains its soft exterior shadows. It has a subtle light-mode border and keeps the same spacing with a transparent dark-mode border. The active tab has a white fill and dark icon and label in dark mode, with the colors reversed in light mode. Its label uses heavier text. The bar overlays the scroll area, so content can pass underneath it and remain visible around it. Scroll containers add bottom clearance to bring their last items above the bar. Page action bars use that same clearance to sit above the tabs.

`layout/mobilePageNavigation.tsx` records the source entry and carries Home's history index across page links, section tabs, and filter URL changes. The Home tab and Back from More pages return to that Home entry or replace the current entry with Home after a direct visit. Back on album detail, including on Android, returns to the previous Gallery entry when opened from Gallery. Direct entry and other origins replace album detail with `/gallery`. Page links from a More destination immediately above Home replace that destination's entry, so browser Back can go directly to Home.

Mobile page navigation mounts `layout/MobilePageLoadingOverlay.tsx`. Its backdrop appears fully opaque on the first frame of the page swap. The live header and tab bar remain usable above it. Gallery list and album detail transitions use the live header and each page's own loading state. Stack routed content within `.mobile-page-body` to keep route styles from trapping the header below the overlay. Covered page content and page-specific actions stay inert until loading and the title handoff finish.

Bottom controls hide when an editable field is focused and the viewport shrinks for the keyboard. They return when the viewport or focus returns.

