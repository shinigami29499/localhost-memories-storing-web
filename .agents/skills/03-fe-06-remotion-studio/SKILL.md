---
name: 03-fe-06-remotion-studio
description: Preview a Remotion video
version: 4.0.543
---

When creating or editing a video, start Remotion Studio and open its preview as soon as the project can run, before building the composition. Keep it open while working so the user can see changes and steer.

```bash
npx remotion studio
```

Use `--no-open` only when an in-app browser can open the exact printed URL; verify Studio and the composition preview load. Studio supports `--port=<number>` and `--force-new`.
