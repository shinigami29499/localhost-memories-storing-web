---
name: web-albums-page
description: "Gallery album listing and management on the web."
---

Gallery opens Albums. The shared album date view shows only dates through today in the displayed month. Selecting a date filters loaded albums by creation day. The fixed carousel shows the current album in a raised frame and the next album in a flat compact button. Activating its preview, title, or owner, or using an upward swipe or drag, advances one album. Arrow Up also advances; a downward gesture or Arrow Down reverses the change. Browser Back from an album restores its date and position. Empty dates use the shared empty state.

The empty state has no create button; the existing page action opens the New album dialog. Creating an album or activating the main card's Send Horizontal link opens its detail. Titles and owner labels are static. Owners edit or delete an album from its detail page. Creation invalidates album queries.

The main card has a circular heart action left of Send Horizontal. It toggles the caller's persisted album favorite and shows a single spinning arc for at least 300 ms and until the request and album-list refresh finish. The selected heart is filled with a tinted circle. Loading ends with a direct swap to the heart, without zoom. Hovering the button pulses the heart when interface and icon motion are enabled and reduced motion is not requested. The busy indicator remains visible with motion disabled.

Legacy Favorites URLs redirect to the album list.

Both frames show loading placeholders until the initial album query settles. Populated frames hold their cover and caption placeholders until the preview resolves.
