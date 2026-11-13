# Component recipes

Adapt these fragments to existing components, semantic HTML, radius, spacing, typography, focus, and theme tokens. `--primary`, `--focus-ring`, `--text-strong`, and `--radius-md` represent existing design-system tokens. Use the theme-specific depth values in [elevation tokens](elevation-tokens.md); tune each example in both themes. CSS alone does not provide interaction or semantics.

## Navigation and active tab

Use a surface container above the base and a raised selected tab; other items stay flat. A small selected shadow and top highlight are optional; avoid gradients or elevating every item. Light mode can use white on gray; dark mode needs distinct surface brightness. Use `aria-current="page"` for navigation links or proper tab roles and `aria-selected` for a tab widget. Add a non-color cue and visible focus.

```css
.nav { background: var(--bg-surface); border-radius: var(--radius-md); padding: .5rem; }
.nav [aria-current="page"], .nav [role="tab"][aria-selected="true"] {
  background: var(--bg-raised); color: var(--text-strong); box-shadow: var(--shadow-sm);
  font-weight: 700; text-decoration: underline; text-underline-offset: .25em;
}
.nav :focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```

## Profile and hover cards

Use a surface with small elevation for a profile or important card; avoid a shadow on every low-priority card. In light mode shadow may carry the cue; in dark mode surface contrast and top highlight matter more. A subtle gradient is optional. Hover elevation applies only to interactive cards and must not be their only affordance. Avoid motion for reduced-motion preferences.

```css
.profile-card, .hover-card { background: var(--bg-surface); border-radius: var(--radius-md); padding: 1rem; box-shadow: var(--shadow-sm); }
.hover-card { transition: box-shadow 180ms ease; }
@media (hover: hover) { .hover-card:hover { box-shadow: var(--shadow-md); } }
.hover-card:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .hover-card { transition: none; } }
```

## Dropdown or important control

Use raised surface, a subtle vertical gradient, top highlight and small shadow when a primary control benefits from elevation. Use medium for its floating menu when warranted. In light mode keep the gradient barely visible; in dark mode tune highlight and separation. Avoid strong shadows on every input. Keep native or correctly implemented control semantics, affordance, and focus.

```css
.important-control {
  background: linear-gradient(180deg, var(--bg-highlight), var(--bg-raised));
  box-shadow: var(--shadow-sm); border-radius: var(--radius-md);
}
.important-control:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```

## Radio option cards

Group related native radios in a fieldset. Provide padded clickable labels, clear label hierarchy and optional meaningful icons. Surface is neutral; selected uses raised plus small shadow and top highlight. In dark mode tune brightness; in light mode use white against a slightly darker container. Avoid replacing a visible radio with color or shadow alone, and avoid this larger treatment for dense, simple choices.

```css
.option-group { background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); }
.option { display: flex; gap: .75rem; padding: 1rem; border-radius: var(--radius-md); }
.option[data-selected="true"] { background: var(--bg-raised); box-shadow: var(--shadow-sm); }
.option:focus-within { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```

Bind `data-selected` to the native radio's checked state; retain its indicator and label association.

## Dashboard: KPI, graph, and table

Use a slightly darker page base, bright raised KPI cards with small or medium shadows, a mid-level surface graph with small or no shadow, and a lower-emphasis recessed table with inset shadow. The sidebar and other regions should follow information priority, not all receive equal weight. A subtle top highlight may help raised panels; gradients are optional. In dark mode use measured brightness separation; in light mode use a restrained shadow. Avoid making every card brightest or making the table look disabled. Remove redundant borders only when boundaries remain clear; support hierarchy with size, placement, spacing, and type.

```css
.dashboard { background: var(--bg-base); }
.kpi { background: var(--bg-raised); box-shadow: var(--shadow-sm); }
.graph { background: var(--bg-surface); box-shadow: var(--shadow-sm); }
.data-table-region { background: var(--bg-recessed); box-shadow: var(--shadow-inset); }
.kpi, .graph, .data-table-region { border-radius: var(--radius-md); padding: 1rem; }
```

## Progress

Use a recessed track and a raised primary fill with a subtle top highlight; no exterior shadow or gradient is needed. Tune track separation and highlight in both themes. Avoid depth effects that hide the fill edge or imply a disabled state. Use native `<progress>` or a correctly labelled progressbar with current, minimum, and maximum values; keep the visual width in sync with the actual value.

```css
.progress-track { background: var(--bg-recessed); box-shadow: var(--shadow-inset); overflow: hidden; }
.progress-fill { width: var(--progress-percent); background: var(--primary); box-shadow: inset 0 1px 0 oklch(1 0 0 / .20); }
```

## Subscription or status badge

Use a lighter surface than its parent, semantic color and typography as appropriate; generally no shadow or gradient. In either theme add a subtle border only when necessary for separation. Avoid turning every badge into a floating card; status must not depend on color alone.

```css
.badge { background: var(--bg-raised); border-radius: 999px; padding: .2rem .55rem; font-weight: 600; }
```

## Pricing or settings sections

Use base for the page, surface for grouped sections, raised and small shadow for a selected plan or important control. Use consistent radius, padding, and spacing; optional restrained top highlights can tie sections together. Adapt surface contrasts to each theme. Avoid random effects, redundant borders, and highlighting every section; reorder content only when it improves hierarchy.

```css
.settings-page { background: var(--bg-base); }
.settings-section { background: var(--bg-surface); border-radius: var(--radius-md); padding: 1.5rem; }
.settings-section .important-choice { background: var(--bg-raised); box-shadow: var(--shadow-sm); }
```

## Popover or dialog

Use raised surface and large elevation when a panel floats above content. A subtle top highlight is built into the shadow; omit decorative gradients unless they support the design. Tune dark and light shadows and surface contrast separately. Avoid large shadows for ordinary in-flow sections. Implement appropriate popover or dialog semantics, focus management, dismissal, and keyboard behavior.

```css
.floating-panel { background: var(--bg-raised); box-shadow: var(--shadow-lg); border-radius: var(--radius-md); padding: 1rem; }
```
