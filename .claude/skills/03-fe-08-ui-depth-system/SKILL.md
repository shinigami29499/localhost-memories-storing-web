---
name: 03-fe-08-ui-depth-system
description: Refine UI styling and visual hierarchy using surface layers, shadows, lighting, and elevation. Use for depth and visual refinement of cards, navigation, dashboards, controls, and overlays.
---

# UI depth system

Use this skill as the primary project guidance for UI depth decisions. Apply it alongside other relevant frontend skills, while honoring explicit user requirements and existing project conventions.

Make hierarchy and interaction clear with a restrained, coherent depth system. Preserve the application's identity and architecture; do not redesign unrelated areas. Use `03-fe-07-ui-color-system` for palette creation and color consistency.

## Core approach

1. Reuse or create three or four coordinated shades of one neutral or brand color for page, surface, raised, and highlight roles. A roughly 0.1 OKLCH lightness change is an exploratory starting point, not a rule; tune the actual differences to the theme.
2. Layer those surfaces and add shadows only where they communicate priority, interaction, elevation, recession, or grouping. Lighter surfaces often feel closer, but preserve relationships appropriate to each theme rather than enforcing a universal lightness direction.

Use a uniform border on raised boxes that need an outline. Make the dark-theme border lighter than the box fill. Use two soft exterior shadows in both themes, a shorter one above and a slightly longer one below. Use the floating Home navigation as the reference.

For same-layer items, use a distinct fill and keep the treatment flat and borderless. For recessed items, keep the longer dark inset above and the shorter light inset below. Match their softness and lengths to the corresponding exterior shadows. When an inset selection tile becomes raised, flip the longer shadow below and the shorter shadow above.

## Workflow

1. Inspect the current UI, theme tokens, styling conventions, and information hierarchy. Identify ambiguous areas and classify surfaces as raised, neutral, or recessed.
2. Reuse the palette and existing components. Apply soft exterior shadows where elevation matters and use inset shadows for recessed items. Keep borders even across all edges.
3. Adjust typography, spacing, grouping, and placement alongside depth. Remove a border only when separation remains clear. Do not use shadow to compensate for poor information architecture.
4. Check both themes and applicable interaction states. Stop when hierarchy is clear and the interface is cohesive; avoid disproportionate polish and a full redesign unless requested.

## References

- [Elevation tokens](references/elevation-tokens.md): theme-specific surface and shadow token starting points.
- [Shadow recipes](references/shadow-recipes.md): lighting, raised and recessed surfaces, hover, and motion.
- [Component recipes](references/component-recipes.md): navigation, cards, controls, dashboard, progress, badges, and overlays.
- [Visual validation](references/visual-validation.md): theme, interaction, accessibility, and visual review.

## Gallery album depth

Mobile dark mode and the dark Gallery use `#1c1c1c` for page backgrounds and `#303030` for raised and inset surfaces. Raised surfaces use translucent black exterior shadows. Inset surfaces use a dark inner shadow and a light inner highlight. Gallery uses exterior shadows for the main frame, idle date tiles, and Move Up, and inset shadows for the selected date. The Send Horizontal control shares the main frame's fill and elevation. Keep both previews flat and passive. Animate the icons when Interface motion and icon motion are enabled and the system allows motion.

For Gallery date tiles and mobile Users search and filters, match raised borders to the component fill at rest. Highlight interactive borders on hover and keep contrasting borders on inset surfaces. Keep keyboard focus indicators visible at every depth.

## Checklist

- Depth communicates hierarchy or interaction; secondary content remains appropriately quiet.
- Surface and shadow relationships are coherent in light and dark themes; no arbitrary elevation or excessive decoration.
- Selected, active, focused, and disabled states are clear and semantically correct; interaction works with keyboard and touch.
- Check actual contrast and focus indicators, progress semantics, and reduced-motion behavior. Inspect responsive layouts and rendered results.
