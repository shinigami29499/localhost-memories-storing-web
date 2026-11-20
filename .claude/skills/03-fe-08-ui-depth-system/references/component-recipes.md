# Component recipes

Adapt these fragments to existing components, semantic HTML, radius, spacing, typography, focus, and theme tokens. `--primary`, `--focus-ring`, `--text-strong`, and `--radius-md` represent existing design-system tokens. Use the theme-specific depth values in [elevation tokens](elevation-tokens.md); tune each example in both themes. CSS alone does not provide interaction or semantics.

## Navigation and active tab

Elevate the floating navigation container with a uniform border and soft shadow. Distinguish the selected tab with a flat fill and stronger text. Use `aria-current="page"` for navigation links or proper tab roles and `aria-selected` for a tab widget. Keep focus visible.

```css
.nav { background: var(--bg-surface); border: 1px solid var(--border-surface); border-radius: var(--radius-md); padding: .5rem; box-shadow: var(--shadow-md); }
.nav [aria-current="page"], .nav [role="tab"][aria-selected="true"] {
  background: var(--bg-base); color: var(--text-strong);
  font-weight: 700; text-decoration: underline; text-underline-offset: .25em;
}
.nav :focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```

## Profile and hover cards

Use a surface with small elevation for a profile or important card. Use a lighter uniform border in dark mode when the card needs an outline. Hover elevation applies only to interactive cards. Keep an obvious affordance at rest and respect reduced motion.

```css
.profile-card, .hover-card { background: var(--bg-surface); border-radius: var(--radius-md); padding: 1rem; box-shadow: var(--shadow-sm); }
.hover-card { transition: box-shadow 180ms ease; }
@media (hover: hover) { .hover-card:hover { box-shadow: var(--shadow-md); } }
.hover-card:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .hover-card { transition: none; } }
```

## Dropdown or important control

When a primary control benefits from elevation, use a raised surface, uniform border, and soft shadow. Use medium elevation for its floating menu when warranted. Keep native or correctly implemented control semantics, affordance, and focus.

```css
.important-control {
  background: var(--bg-raised);
  border: 1px solid var(--border-surface);
  box-shadow: var(--shadow-sm); border-radius: var(--radius-md);
}
.important-control:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```

## Radio option cards

Group related native radios in a fieldset. Provide padded clickable labels, clear label hierarchy, and optional meaningful icons. Use a neutral surface and a soft exterior shadow for raised selection tiles. Retain the visible radio indicator.

```css
.option-group { background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); }
.option { display: flex; gap: .75rem; padding: 1rem; border-radius: var(--radius-md); }
.option[data-selected="true"] { background: var(--bg-raised); box-shadow: var(--shadow-sm); }
.option:focus-within { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```

Bind `data-selected` to the native radio's checked state; retain its indicator and label association.

## Dashboard: KPI, graph, and table

Use a neutral page base, raised KPI cards with soft shadows, a graph surface with lower elevation, and a recessed table with inset shadows. Establish hierarchy through surface contrast, size, placement, spacing, and type.

```css
.dashboard { background: var(--bg-base); }
.kpi { background: var(--bg-raised); box-shadow: var(--shadow-sm); }
.graph { background: var(--bg-surface); box-shadow: var(--shadow-sm); }
.data-table-region { background: var(--bg-recessed); box-shadow: var(--shadow-inset); }
.kpi, .graph, .data-table-region { border-radius: var(--radius-md); padding: 1rem; }
```

## Progress

Use a recessed track and a solid primary fill. Tune their separation in both themes. Use native `<progress>` or a correctly labelled progressbar with current, minimum, and maximum values. Keep the visual width in sync with the actual value.

```css
.progress-track { background: var(--bg-recessed); box-shadow: var(--shadow-inset); overflow: hidden; }
.progress-fill { width: var(--progress-percent); background: var(--primary); }
```

## Subscription or status badge

Use a lighter surface than its parent, semantic color and typography as appropriate; generally no shadow or gradient. In either theme add a subtle border only when necessary for separation. Avoid turning every badge into a floating card; status must not depend on color alone.

```css
.badge { background: var(--bg-raised); border-radius: 999px; padding: .2rem .55rem; font-weight: 600; }
```

## Pricing or settings sections

Use base for the page, surface for grouped sections, and a raised fill with soft shadow for a selected plan or important control. Use consistent radius, padding, and spacing. Adapt surface contrast to each theme.

```css
.settings-page { background: var(--bg-base); }
.settings-section { background: var(--bg-surface); border-radius: var(--radius-md); padding: 1.5rem; }
.settings-section .important-choice { background: var(--bg-raised); box-shadow: var(--shadow-sm); }
```

## Popover or dialog

Use a raised surface, uniform border, and soft exterior shadows when a panel floats above content. Tune shadows and surface contrast in both themes. Implement appropriate popover or dialog semantics, focus management, dismissal, and keyboard behavior.

```css
.floating-panel { background: var(--bg-raised); border: 1px solid var(--border-surface); box-shadow: var(--shadow-lg); border-radius: var(--radius-md); padding: 1rem; }
```
