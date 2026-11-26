---
name: mobile-media-preview-dialog
description: Mobile photo and video viewer for gallery and immersive album detail.
---

`gallery/MobileMediaPreviewDialog.tsx` receives the media list, starting ID, optional inline playback position, paging callbacks, and close callback. The shared viewer hook owns the selected slide and paging. Mobile album detail uses immersive mode with a full-width slide, photo zoom, and a custom fullscreen video player. The active slide hosts the video surface. The dialog holds the dock in place across consecutive videos. It passes the inline playback position for the opening video and starts subsequent videos from zero. When album audio is supplied, the dialog passes the same mute and volume settings and forwards sound changes to the album. The photo zoom path and video controls preserve their own gestures.
