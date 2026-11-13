# Color system implementation reference

Examples are starting points, not a validated palette. Measure rendered contrast in each context and adjust for the target gamut. Use CSS variables in React, Vue, Angular, plain CSS, or any other frontend framework; integrate into existing styles and theme controls.

## Scales and elevation

Start with true gray: `--neutral-0: oklch(0 0 0); --neutral-5: oklch(0.05 0 0); --neutral-10: oklch(0.10 0 0);`. With C=0, hue does not matter. A small consistent chroma can tint neutrals after hierarchy works. Keep related brand shades at a consistent hue, varying L and, where needed, C to keep intensity balanced; do not mechanically change every component. Inspect for out-of-gamut colors on target displays.

For an illustrative dark HSL starting point, page/card/raised backgrounds are `hsl(0 0% 0%)`, `hsl(0 0% 5%)`, and `hsl(0 0% 10%)`. A lighter surface appears closer: use the brightest selectively, with visible but restrained separation. For initial light HSL candidates, subtract dark lightness from 100 (0→100, 5→95, 10→90), then reassign by visual hierarchy: page `hsl(0 0% 95%)`, card `hsl(0 0% 98%)`, raised `hsl(0 0% 100%)`. Light cards generally sit lighter than the page; use subtle borders and shadows. HSL increments are not perceptually uniform. Choose visually equivalent OKLCH shades rather than copying HSL lightness numbers. All values are adjustable.

## Semantic CSS tokens

This skeleton uses explicit selection plus a system fallback. `data-theme` is placed on the root element; an absent attribute follows the OS. If an existing app has its own mechanism, preserve it. Apply a persisted user choice before first paint when appropriate, offer a system option that removes the attribute, and never let the OS override an explicit choice. Guard storage access if the environment can deny it.

```css

:root[data-theme="light"] {
  color-scheme: light;
  --bg-dark: oklch(0.92 0 20);
  --bg: oklch(0.96 0 20);
  --bg-light: oklch(1 0 20);
  --text: oklch(0.15 0 20);
  --text-muted: oklch(0.4 0 20);
  --highlight: oklch(1 0 20);
  --border: oklch(0.6 0 20);
  --border-muted: oklch(0.7 0 20);
  --primary: oklch(0.18 0 0);
  --secondary: oklch(0.4 0 0);
  --success-solid: oklch(0.55 0.16 160);
  --warning-solid: oklch(0.78 0.17 95);
  --danger-solid: oklch(0.55 0.18 30);
  --info-solid: oklch(0.55 0.16 260);
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --bg-dark: oklch(0.1 0 20);
  --bg: oklch(0.15 0 20);
  --bg-light: oklch(0.2 0 20);
  --text: oklch(0.96 0 20);
  --text-muted: oklch(0.76 0 20);
  --highlight: oklch(0.5 0 20);
  --border: oklch(0.4 0 20);
  --border-muted: oklch(0.3 0 20);
  --primary: oklch(0.96 0 0);
  --secondary: oklch(0.76 0 0);
  --success: oklch(0.75 0.16 160);
  --warning: oklch(0.86 0.17 95);
  --danger: oklch(0.7 0.18 30);
  --info: oklch(0.75 0.16 260);
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
