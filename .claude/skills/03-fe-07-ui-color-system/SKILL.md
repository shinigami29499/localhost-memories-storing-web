---
name: 03-fe-07-ui-color-system
description: Design or refine UI color palettes, styling, semantic tokens, and light/dark themes for frontend interfaces. Use when implementing or adjusting UI colors, brand and status colors, or color-related accessibility.
---

# UI color system

Use this skill as the primary project guidance for UI color decisions. Apply it alongside other relevant frontend skills, while honoring explicit user requirements and existing project conventions.

Build a small, coherent palette with perceptually balanced shades, clear elevation, subtle lighting, and semantic tokens. Stop when the result is cohesive, functional, and accessible. Work with the existing framework and theme system; do not redesign unrelated UI or replace working conventions.

## Workflow

1. Inspect existing theme, CSS conventions, components, and both themes. Identify and reuse working neutral, primary, and semantic colors.
2. Use only three color categories: neutral for most surfaces, structure, and text; one primary hue for brand and main actions; semantic success, warning, error, and information colors only for meaning. Add an accent only for a clear functional reason.
3. Establish neutral background elevation and primary/secondary text first. Use semantic CSS custom properties whose names work in both themes. Then define restrained borders, gradients, highlights, and layered shadows only where useful.
4. Choose a brand hue and coherent interaction shades; optionally add very low chroma to neutrals for warmth or coolness. Apply semantic tokens consistently instead of inventing component colors.
5. Inspect both themes and component states, check contrast and display gamut, remove arbitrary duplicates, and fine-tune only where necessary. Keep scope proportional to the request.

Prefer `oklch(L C H / A)`: L is 0–1, C is intensity (UI colors commonly 0–0.2, often much lower), H is 0–360 degrees, and A is optional alpha. Start neutrals at zero chroma, where hue has no visible effect. Hold related hues reasonably consistent; adjust lightness for hierarchy and chroma for perceived intensity. Check target gamut and avoid strong saturation on large surfaces. HSL is an acceptable fallback: its hue is 0–360, saturation and lightness are percentages, and hue is irrelevant at 0% saturation. Its lightness increments are not perceptually uniform; do not equate HSL and OKLCH numeric lightness.

For concrete theme, state, component, and Tailwind v4 implementation, read [references/implementation.md](references/implementation.md) when building or substantially changing a palette. Adapt its illustrative values and validate them in context; they are not certified contrast pairs.

## Validation

- Inspect page, cards, raised elements, overlays, inputs, alerts, and primary and secondary buttons in both themes. Check default, hover, active, disabled, and keyboard focus states as applicable.
- Measure contrast for actual rendered foreground/background combinations, including gradients and composited transparency: at least 4.5:1 for normal text, 3:1 for large text, and 3:1 for relevant non-text UI boundaries and indicators against adjacent colors. Test focus separately from decorative borders.
- Check semantic colors and button labels on every relevant state and surface. Use text, icon, shape, or another cue in addition to color for meaningful status. Disabled controls must also be functionally disabled; do not treat muted text alone as a disabled state.
- Confirm system and explicit theme selection work as intended, with explicit selection taking precedence. Check readability, restrained separation and elevation, coherent hues, target gamut, and responsive surfaces. Stop once the result is coherent and accessible.
