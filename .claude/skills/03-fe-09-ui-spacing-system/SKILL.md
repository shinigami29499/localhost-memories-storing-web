---
name: 03-fe-09-ui-spacing-system
description: Primary project guidance for UI spacing, grouping, alignment, and padding. Use for UI implementation, components, visual refinement, responsive layouts, and Figma-to-frontend work.
---

# UI spacing system

Use this skill as the primary project guidance for spacing and grouping alongside other applicable UI skills. Functional correctness, accessibility, explicit user requirements, and existing project constraints take precedence. Use color and depth skills for their respective domains. Establish spacing before refining color, shadows, gradients, or decoration.

## Core rules

- Space communicates relationships: keep related items close, separate distinct groups, and give major sections more room. Consistency means consistent relationships, not identical gaps.
- Reuse existing tokens, utilities, and component conventions. Prefer rem; when no scale exists, use 0.25rem increments: 0.25, 0.5, 0.75, 1, 1.25, 1.5, and 2rem. At a 16px root these are 4, 8, 12, 16, 20, 24, and 32px. Tailwind values depend on the project's configuration. Deviate deliberately when context requires it.
- Start near 0.5rem for close relationships, 1rem for common gaps, and 1.5?2rem for distinct groups or sections. Adjust for density, content, and viewport. Start a new layout relatively spacious and refine downward; compact contexts may need less.
- Outer padding generally equals or exceeds internal gaps. Exceptions are appropriate for distinct purposes within a container. Keep text-button horizontal padding greater than vertical padding as an optical starting point; icon-only, square, circular, multiline, and stacked controls differ. Preserve accessible target sizes.
- Use flex or grid for alignment and repeated layouts; use space-between for opposite edges, not close groups. Align peer controls without clipping validation messages or multiline content. Preserve established action placement and interaction patterns.

## Workflow

1. Inspect component structure, spacing tokens, utilities, and existing responsive conventions. Preserve behavior and avoid unrelated layout changes.
2. Identify semantic groups. Choose scale values for close items, component groups, and sections; start with generous outer padding and refine it to the context.
3. Balance padding and gaps optically. Align peer controls and cards; replace arbitrary positioning gaps with appropriate layout primitives.
4. Check desktop and narrow viewports. Adapt section padding and stacking deliberately while retaining group hierarchy, readable content, accessible touch targets, and no horizontal overflow.
5. Refine color and depth only after spacing works. Stop when hierarchy is clear and consistent.

## References

Read only the references relevant to the task:

- [Scale and grouping](references/scale-grouping.md): default scale, grouping, sections, alignment, and radius.
- [Controls and forms](references/controls-forms.md): buttons, icons, inputs, dropdowns, radio groups, forms, and actions.
- [Content and layouts](references/content-layouts.md): lists, profile cards, navigation, grids, dashboards, progress, and pages.
- [Responsive spacing](references/responsive.md): mobile adaptations and validation.

## Checklist

- Related items are closer than unrelated groups; comparable components use consistent padding and gaps. Whitespace supports readability.
- No uniform 0.5rem gaps everywhere, unjustified oversized inner gaps, cramped cards or forms, random pixel margins, or fixed large gaps used for alignment.
- Button proportions are optically balanced rather than uniformly equal in both directions. Peer controls align without clipping; icons remain legible and grouped correctly.
- Check narrow and wide layouts, wrapping, overflow, readable grouping, and interactive target sizes. Avoid over-adjusting a clear layout.
