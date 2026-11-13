# Color system implementation reference

Examples are starting points, not a validated palette. Measure rendered contrast in each context and adjust for the target gamut. Use CSS variables in React, Vue, Angular, plain CSS, or any other frontend framework; integrate into existing styles and theme controls.

## Scales and elevation

Start with true gray: `--neutral-0: oklch(0 0 0); --neutral-5: oklch(0.05 0 0); --neutral-10: oklch(0.10 0 0);`. With C=0, hue does not matter. A small consistent chroma can tint neutrals after hierarchy works. Keep related brand shades at a consistent hue, varying L and, where needed, C to keep intensity balanced; do not mechanically change every component. Inspect for out-of-gamut colors on target displays.

For an illustrative dark HSL starting point, page/card/raised backgrounds are `hsl(0 0% 0%)`, `hsl(0 0% 5%)`, and `hsl(0 0% 10%)`. A lighter surface appears closer: use the brightest selectively, with visible but restrained separation. For initial light HSL candidates, subtract dark lightness from 100 (0→100, 5→95, 10→90), then reassign by visual hierarchy: page `hsl(0 0% 95%)`, card `hsl(0 0% 98%)`, raised `hsl(0 0% 100%)`. Light cards generally sit lighter than the page; use subtle borders and shadows. HSL increments are not perceptually uniform. Choose visually equivalent OKLCH shades rather than copying HSL lightness numbers. All values are adjustable.

## Semantic CSS tokens

This skeleton uses explicit selection plus a system fallback. `data-theme` is placed on the root element; an absent attribute follows the OS. If an existing app has its own mechanism, preserve it. Apply a persisted user choice before first paint when appropriate, offer a system option that removes the attribute, and never let the OS override an explicit choice. Guard storage access if the environment can deny it.

```css
:root {
  color-scheme: light;
  --bg-base: oklch(0.96 0 0);
  --bg-surface: oklch(0.985 0 0);
  --bg-raised: oklch(1 0 0);
  --text-primary: oklch(0.16 0 0);
  --text-secondary: oklch(0.42 0 0);
  --text-disabled: oklch(0.60 0 0);
  --border-subtle: oklch(0.93 0 0);
  --border-default: oklch(0.86 0 0);
  --border-strong: oklch(0.56 0 0);
  --highlight-top: oklch(1 0 0 / 0.9);
  --surface-gradient: linear-gradient(180deg, var(--bg-raised), var(--bg-surface));
  --surface-gradient-hover: linear-gradient(180deg, var(--bg-raised), var(--bg-base));
  --shadow-card: 0 2px 4px oklch(0 0 0 / 0.10), 0 12px 32px oklch(0 0 0 / 0.05);
  --primary-solid: oklch(0.48 0.15 260);
  --primary-hover: oklch(0.42 0.15 260);
  --primary-active: oklch(0.36 0.14 260);
  --primary-disabled: oklch(0.72 0.04 260);
  --primary-on-solid: oklch(1 0 0);
  --primary-subtle: oklch(0.94 0.025 260);
  --primary-text: oklch(0.38 0.12 260);
  --focus-ring: oklch(0.48 0.15 260);
  --success-solid: oklch(0.48 0.12 150);
  --success-subtle: oklch(0.95 0.035 150);
  --success-text: oklch(0.32 0.08 150);
  --success-border: oklch(0.65 0.10 150);
  --warning-solid: oklch(0.55 0.12 80);
  --warning-subtle: oklch(0.96 0.045 90);
  --warning-text: oklch(0.35 0.07 80);
  --warning-border: oklch(0.70 0.11 80);
  --error-solid: oklch(0.50 0.17 25);
  --error-subtle: oklch(0.95 0.035 25);
  --error-text: oklch(0.36 0.13 25);
  --error-border: oklch(0.65 0.13 25);
  --info-solid: oklch(0.48 0.13 240);
  --info-subtle: oklch(0.95 0.025 240);
  --info-text: oklch(0.36 0.10 240);
  --info-border: oklch(0.65 0.10 240);
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg-base: oklch(0.10 0 0);
  --bg-surface: oklch(0.15 0 0);
  --bg-raised: oklch(0.20 0 0);
  --text-primary: oklch(0.94 0 0);
  --text-secondary: oklch(0.72 0 0);
  --text-disabled: oklch(0.50 0 0);
  --border-subtle: oklch(0.25 0 0);
  --border-default: oklch(0.30 0 0);
  --border-strong: oklch(0.55 0 0);
  --highlight-top: oklch(0.45 0 0 / 0.55);
  --surface-gradient: linear-gradient(180deg, var(--bg-raised), var(--bg-surface));
  --surface-gradient-hover: linear-gradient(180deg, oklch(0.24 0 0), var(--bg-surface));
  --shadow-card: 0 2px 4px oklch(0 0 0 / 0.18), 0 12px 32px oklch(0 0 0 / 0.08);
  --primary-solid: oklch(0.72 0.12 260);
  --primary-hover: oklch(0.78 0.10 260);
  --primary-active: oklch(0.66 0.13 260);
  --primary-disabled: oklch(0.38 0.04 260);
  --primary-on-solid: oklch(0.16 0 0);
  --primary-subtle: oklch(0.25 0.05 260);
  --primary-text: oklch(0.80 0.09 260);
  --focus-ring: oklch(0.80 0.10 260);
  --success-solid: oklch(0.74 0.12 150);
  --success-subtle: oklch(0.25 0.05 150);
  --success-text: oklch(0.82 0.10 150);
  --success-border: oklch(0.58 0.10 150);
  --warning-solid: oklch(0.80 0.12 85);
  --warning-subtle: oklch(0.27 0.05 85);
  --warning-text: oklch(0.87 0.10 85);
  --warning-border: oklch(0.65 0.10 85);
  --error-solid: oklch(0.73 0.14 25);
  --error-subtle: oklch(0.26 0.06 25);
  --error-text: oklch(0.82 0.10 25);
  --error-border: oklch(0.60 0.13 25);
  --info-solid: oklch(0.75 0.11 240);
  --info-subtle: oklch(0.25 0.05 240);
  --info-text: oklch(0.83 0.08 240);
  --info-border: oklch(0.60 0.10 240);
}
```

For a system dark fallback, put the same dark declarations in `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { ... } }`, or use a shared generated selector/mixin so declarations do not drift. Explicit `data-theme="light"` remains light; explicit dark remains dark. Do not copy literal ellipses into production CSS.

## Component use

- Page: `--bg-base`, primary text for headings and important content; secondary text for metadata and descriptions. Use near-white and near-black rather than insisting on extremes. Keep secondary text readable.
- Cards and panels: `--bg-surface`, subtle/default border, optional gradient, top highlight and shadow. Raised elements and dialogs/popovers use `--bg-raised`, appropriate border and elevation; distinguish overlays from the page.
- Borders are separation, highlights are lighting: keep tokens independent. Dark borders are slightly lighter than adjacent surfaces; light borders are subtle. Highlight the top edge without a bright outline. Focus indicators must stand apart from both.
- Gradients: dark surfaces may use a slightly lighter top and darker bottom, as in `background: var(--surface-gradient)`. Increase the difference subtly on hover. Define theme-appropriate light gradients; never reuse fixed dark gradient colors unchanged. Adjust direction and strength to fit the interface.
- Shadows: combine a darker short shadow and lighter long shadow with alpha, as in `--shadow-card`. Increase strength for higher elevation only. Dark themes often rely more on surface lightness and borders; light themes benefit more from shadows. Apply consistently from base to surface to raised to overlay.
- Primary buttons: use solid, on-solid, hover, active, disabled, and focus tokens. Hover need not be lighter; distinguish it in context. Check foreground contrast for each enabled state. Use a native disabled attribute or equivalent behavior. Secondary buttons use a neutral or subtle surface and a visible border when needed, with less emphasis.
- Inputs: neutral surface, legible text and placeholder, subtle boundary, distinct focus, error and disabled states. Focus should be visible without hover. Alerts and badges use semantic subtle, text, border and, for high emphasis, solid colors. Supply a separately validated foreground when text appears on a solid semantic background; add text or icons to convey status.
- Use `--text-disabled` only as part of a complete disabled treatment. Decorative borders can be subtle, but boundaries needed to identify controls and state indicators need sufficient contrast against adjacent colors.

A visible focus example: `:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }`. Measure the ring against each adjacent surface and adjust or use a two-color ring where needed. Avoid heavy outlines on every card, harsh pure-white text everywhere, vivid large backgrounds, decorative use of status colors, and unrelated component-specific hues.

## Tailwind CSS v4

Expose runtime semantic variables through inline theme mappings when utility classes are useful, preserving an existing setup:

```css
@theme inline {
  --color-page: var(--bg-base);
  --color-surface: var(--bg-surface);
  --color-content: var(--text-primary);
  --color-primary: var(--primary-solid);
  --color-on-primary: var(--primary-on-solid);
}
```

Use utilities such as `bg-page`, `bg-surface`, `text-content`, and `bg-primary`; runtime theme overrides still change the underlying variables. Map other roles only as needed.
