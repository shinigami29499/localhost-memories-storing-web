---
name: 03-fe-06-remotion-markup
description: Content, animation and effects best practices for Remotion React markup
version: 4.0.543
---

Use this guidance when writing Remotion React markup.

- Keep `useCurrentFrame()` in the smallest component that needs it.
- Inside a composition or scene, get `fps` from `useVideoConfig()` for seconds-to-frames calculations.
- Drive animation with `useCurrentFrame()` and `interpolate()`. CSS transitions and animations do not render correctly in Remotion.
- Use `Easing.bezier()` or `Easing.spring()` for timing.
- Keep interpolation calls inline on editable props. Prefer CSS `scale`, `translate`, and `rotate` properties over `transform`.
- Structure markup around the editing units users should independently select, move, trim, or style. See [Interactivity](../03-fe-06-remotion-interactivity/SKILL.md).
- Keep each independently editable composition or still as an authored JSX node. Put JSON-serializable `defaultProps` inline on that node.
- Use `<Still>` for single-frame images. Use `calculateMetadata` for dimensions, duration, or props derived from input or media.

Always consult current [Remotion documentation](../03-fe-06-remotion-docs/SKILL.md) for API details.
