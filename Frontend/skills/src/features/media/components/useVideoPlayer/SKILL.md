---
name: use-video-player
description: Shared video playback, time, and fullscreen state.
---

`src/features/media/components/useVideoPlayer.ts` accepts a source, accessible name, and optional error callback. It provides media and player refs, playback and seeking actions, and metadata for the web and mobile controls. Source changes reset playback and progress state. The hook pauses playback when the document hides and releases the old source only if the element still uses it.
