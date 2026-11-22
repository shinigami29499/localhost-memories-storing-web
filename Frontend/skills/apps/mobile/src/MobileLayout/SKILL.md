---
name: mobile-layout
description: Mobile authenticated shell and navigation.
---

MobileLayout.tsx hosts authenticated routes, the menu bar, and page action bars. The notification bell, More button, and floating Home, Album, Place, and User menu items remain mounted across authenticated routes. The `.mobile-menu-bar` uses `data-item` values to move its indicator between active items, including on browser history navigation. On secondary pages with no menu item, the indicator is hidden. The active item follows the route and uses `aria-current`.

On Home, the bordered avatar, username, and localized role come from the signed-in account and link to Profile. The Album, Place, and User menu items open `/album`, `/location`, and `/user`, with matching page titles. The Album list uses the Home tab. Album detail shows Back and returns to the list. Opening detail from the list preserves the Album header title and bypasses the overlay. Android Back dismisses the Add album dialog before leaving the list. Place and User keep Back inert. More pages keep their gradient title and Back button. The blue, purple, and pink title gradient moves horizontally in a seamless four-second loop. It runs independently of Interface motion and stays static under system reduced motion. More's icon morphs with the dialog. Motion follows the interface setting and system reduced motion.

Bottom navigation remains available on the album list and detail. The album list owns its separate Add album action. It enters once the album query allows it. Motion respects Interface motion and reduced motion.

Dragging horizontally from the current menu item moves the indicator by the pointer's horizontal displacement, clamped to the first and last tab in either writing direction. The nearest tab gets the preview styling, while `aria-current` follows the committed route. Release over another tab to settle the indicator from its current position and start loading through `useOpenMobilePage`. Release outside the tabs or cancel the pointer to restore the route highlight.

The More button opens a modal bottom sheet with User profile, Upload, Settings, and Log out. The sheet slides up when opened and down when dismissed. Tapping the backdrop or pressing Escape closes it and returns focus to the More button. Selecting a destination closes the sheet before navigation. Log out closes it and calls the shared logout hook. Appearance controls live on the Settings page.

The shell and its page-loading overlay share the mobile theme background. The notification, More, and Back buttons share flat, borderless styling. In dark mode, all three use the raised fill to stand out against the header. The floating navigation, More sheet, and notification panel use the shared raised fill, which is `#303030` in dark mode. The floating navigation retains its soft exterior shadows. It has a subtle light-mode border and keeps the same spacing with a transparent dark-mode border. The active tab has a white fill and dark icon and label in dark mode, with the colors reversed in light mode. Inactive labels use weight 500; highlighted labels use weight 600. The bar overlays the scroll area, so content can pass underneath it and remain visible around it. Scroll containers add bottom clearance to bring their last items above the bar. Page action bars use that same clearance to sit above the tabs.

`layout/mobilePageNavigation.tsx` records the source entry and carries Home's history index across page links, menu items, and filter URL changes. The Home item and Back from More pages return to that Home entry or replace the current entry with Home after a direct visit. Back on album detail, including on Android, returns to the previous Album entry when opened from Album. Direct entry and other origins replace album detail with `/album`. Page links from a More destination immediately above Home replace that destination's entry, so browser Back can go directly to Home.

Mobile page navigation shows the component-loading overlay inside the page body while React Router resolves the destination module. Header controls and tabs remain available. Covered route content and its action bar are inert until the destination commits. The destination mounts after the overlay and title animation finish. If another navigation interrupts that animation, the deferred page stays unmounted while the next destination loads.

Bottom controls hide when an editable field is focused and the viewport shrinks for the keyboard. They return when the viewport or focus returns.

