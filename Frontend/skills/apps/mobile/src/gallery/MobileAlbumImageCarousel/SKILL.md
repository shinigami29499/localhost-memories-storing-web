---
name: mobile-album-image-carousel
description: Looping photo and video preview in mobile album detail.
---

`gallery/MobileAlbumImageCarousel.tsx` receives an album ID and optional combined media count. It uses the authenticated album media query, starts at the first item in server order, and requests the next page near the end of loaded items. A known zero count bypasses the request. The scroll track snaps horizontally on touch and mouse drag and supports arrow keys when focused. The preview advances every four seconds and wraps to the first item. Holding the frame pauses cycling and inline playback until release or cancellation. A hold can continue into a swipe or drag. Long presses and drags suppress taps that would open the viewer. The preview frame opts out of button press scaling.

Only the active preview video plays inline. A single video element switches sources as the carousel advances. The album detail session starts muted. Mute and volume persist across clips, photos, wraparound, and the fullscreen viewer until the user changes them or leaves album detail. The top-right volume icon fades in on playable videos and fades out when the carousel leaves them. Activating it toggles mute. When unmuted, the group expands left and reveals a compact 0–100 slider to the right of the icon. The first unmute uses 75%. Escape mutes and returns focus to the icon. Expansion and fades respect motion preferences. The carousel keeps cycling with audio enabled. Video errors fall back to the preview image.

Activating a frame opens `MobileMediaPreviewDialog` at that item and pauses the inline slideshow until close. The immersive mode fills the viewport with a black background and displays the whole image. Pinch to zoom up to four times the fitted size. Double-click or double-tap to toggle between fit and 2.5×. Drag the zoomed photo to pan. Swipe at fitted size or use arrow keys to browse the same paginated set. Changing photos resets zoom. The 40 px Close button stays visible at the top right with an enlarged hit target. Close, Escape, and native Android Back dismiss the modal and return to the album preview.

Opening an active video passes its current inline playback position to the fullscreen viewer for autoplay.

The full-screen viewer fades in and out when Interface motion is enabled and the system allows motion. During the exit fade, the native dialog stays open and blocks interaction with the album. The Close button keeps its fill on hover and uses an accessible name for its label.

The bottom-left indicator places sharp dots over a separate blurred backdrop with 25% tint opacity. It shows up to five fixed slots based on the full media total. Dot width animates only when the active slot changes. The middle dot stays still until the final two items use the last two slots. The accessible announcement reports the full position and total across pages. Dot motion and keyboard scrolling respect the interface motion setting and reduced motion.
