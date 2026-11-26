---
name: mobile-video-player
description: Themed video playback and fullscreen controls in the mobile media viewer.
---

`gallery/MobileVideoPlayer.tsx` receives the authorized media URL, poster, accessible filename, and error callback from `MobileMediaPreviewDialog`. It uses the shared playback hook for playback and metadata. A themed dock uses project icon buttons and a labeled progress slider for seeking. In the immersive album viewer and browser fullscreen, the dock overlays the centered video with safe-area spacing. Showing and hiding it preserves the video bounds.

The fullscreen dock opens visible. Tapping the video surface toggles it and restarts the idle timer. During playback it fades after three seconds of inactivity. Paused playback has no idle timer. Active drags and keyboard focus keep the dock available. The viewer's close button stays available.

The immersive player starts the opening video at its inline preview position and plays it automatically. The video surface mounts in the active carousel slide. The same dock stays anchored to the dialog across adjacent videos. A new source starts from zero and plays automatically. The seek indicator and thumb transition to zero, and the visible time digits animate. These transitions respect motion preferences.

Unmuting in fullscreen reveals a vertical volume slider above the sound button. The album carousel owns mute and volume for the detail session. Fullscreen changes update the same settings used in inline previews. The gallery player uses local sound settings when no album audio is supplied. Immersive swipes can start on the video surface. The seek, volume, and playback controls stay separate from carousel gestures.
