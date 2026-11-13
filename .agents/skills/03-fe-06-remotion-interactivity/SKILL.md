---
name: 03-fe-06-remotion-interactivity
description: Structure Remotion markup so layers, timing and styles are editable in Studio
version: 4.0.543
---

Make authored markup editable in Studio by default. Keep programmatic-only content for externally generated or per-frame computed data, and tell the user when it cannot be edited.

- Structure code around items users should select, move, trim, or style independently.
- Keep editable values inline on each instance.
- Schema keys define props Studio can read and edit. Use `string`, `number`, `boolean`, `color`, `enum`, `array`, and `asset` according to the data.
- Read the timeline structure guide before writing or restructuring scenes: https://github.com/remotion-dev/skills/tree/main/skills/remotion-interactivity
- For nested scenes with their own editable timeline, see connected compositions: https://github.com/remotion-dev/skills/tree/main/skills/remotion-markup
