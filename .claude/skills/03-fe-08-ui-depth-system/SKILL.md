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

Use a consistent overhead light: a subtle top inset highlight and dark exterior shadow below for raised surfaces; a dark top inset and light bottom inset for recessed surfaces. Use three reusable small, medium, and large shadow levels, increasing gradually by visual priority rather than component size. Two shadow layers usually suffice. Keep gradients, highlights, movement, and large shadows restrained.

## Workflow

1. Inspect the current UI, theme tokens, styling conventions, and information hierarchy. Identify ambiguous areas and classify surfaces as raised, neutral, or recessed.
2. Reuse the palette and existing components; add missing depth tokens only when needed. Set coordinated surfaces, then apply small shadows to important or selected elements and stronger shadows only where justified. Add subtle lighting or inset shadows when useful.
3. Adjust typography, spacing, grouping, and placement alongside depth. Remove a border only when separation remains clear. Do not use shadow to compensate for poor information architecture.
4. Check both themes and applicable interaction states. Stop when hierarchy is clear and the interface is cohesive; avoid disproportionate polish and a full redesign unless requested.

## References

- [Elevation tokens](references/elevation-tokens.md): theme-specific surface and shadow token starting points.
- [Shadow recipes](references/shadow-recipes.md): lighting, raised and recessed surfaces, hover, and motion.
- [Component recipes](references/component-recipes.md): navigation, cards, controls, dashboard, progress, badges, and overlays.
- [Visual validation](references/visual-validation.md): theme, interaction, accessibility, and visual review.

## Checklist

- Depth communicates hierarchy or interaction; secondary content remains appropriately quiet.
- Surface and shadow relationships are coherent in light and dark themes; no arbitrary elevation or excessive decoration.
- Selected, active, focused, and disabled states are clear and semantically correct; interaction works with keyboard and touch.
- Check actual contrast and focus indicators, progress semantics, and reduced-motion behavior. Inspect responsive layouts and rendered results.
