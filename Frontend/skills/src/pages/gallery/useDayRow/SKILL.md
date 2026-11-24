---
name: use-day-row
description: Render and navigate a virtualized gallery day row.
---

Web and mobile day rows share this hook. It calculates visible tiles from scroll position and viewport dimensions, preserves focused and pinned tiles, and supports keyboard navigation. Scroll position and edge controls update on animation frames. Near-end pagination checks run at most once per 100 ms with a trailing check. Unmount cancels pending work.
