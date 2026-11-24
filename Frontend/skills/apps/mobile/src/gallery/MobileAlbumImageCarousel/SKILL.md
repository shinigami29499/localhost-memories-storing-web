---
name: mobile-album-image-carousel
description: Scrollable image preview in mobile album detail.
---

`gallery/MobileAlbumImageCarousel.tsx` receives an album ID and optional image count. It uses the authenticated album media query with the image filter, starts at the first image, and requests the next page near the end of loaded images. Zero images bypass the request. The scroll track snaps to slides on touch and supports arrow keys when focused. Double clicking the preview has no action.

The bottom-left indicator places sharp dots over a separate blurred backdrop with 25% tint opacity. It shows up to five fixed slots based on the full image total. Dot width animates only when the active slot changes. The middle dot stays still until the final two images use the last two slots. The accessible announcement reports the full position and total across pages. Dot motion and keyboard scrolling respect the interface motion setting and reduced motion.
