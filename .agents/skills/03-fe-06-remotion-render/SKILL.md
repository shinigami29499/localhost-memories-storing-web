---
name: 03-fe-06-remotion-render
description: Export a Remotion video
version: 4.0.543
---

Render only when the user explicitly asks for an export. Prefer Remotion's bundled browser. Do not reuse a recording browser or set a custom browser executable unless requested.

```bash
npx remotion render [composition-id] out/video.mp4
npx remotion still [composition-id] out/still.png
```

Pass props inline as JSON or from a JSON file with `--props`. Use `--is-production=false` for test renders. Only pass `--license-key` when a valid key is available. For transparent video, consult the [Remotion transparent video documentation](https://www.remotion.dev/docs/transparent-videos).
