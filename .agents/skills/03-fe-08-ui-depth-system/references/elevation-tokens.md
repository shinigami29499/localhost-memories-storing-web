# Elevation tokens

Reuse existing semantic tokens first. These illustrative values are starting points, not certified contrast combinations. Tune separately against actual adjacent surfaces and rendered text. Three or four coordinated shades are often enough. In OKLCH, try around 0.1 lightness difference while exploring, then adjust; these dark examples use 0.06 increments.

```css
:root {
  --bg-base: oklch(0.94 0 0);
  --bg-recessed: oklch(0.92 0 0);
  --bg-surface: oklch(0.97 0 0);
  --bg-raised: oklch(1 0 0);
  --bg-highlight: oklch(1 0 0);
  --highlight-top: oklch(1 0 0 / 0.8);
  --shadow-color: oklch(0 0 0 / 0.16);
  --shadow-sm: inset 0 1px 0 oklch(1 0 0 / 0.8), 0 2px 4px oklch(0 0 0 / 0.12);
  --shadow-md: inset 0 1px 0 oklch(1 0 0 / 0.9), 0 5px 12px oklch(0 0 0 / 0.16);
  --shadow-lg: inset 0 1px 0 oklch(1 0 0 / 0.9), 0 10px 28px oklch(0 0 0 / 0.20);
  --shadow-inset: inset 0 2px 4px oklch(0 0 0 / 0.12), inset 0 -1px 0 oklch(1 0 0 / 0.55);
}
[data-theme="dark"] {
  --bg-base: oklch(0.12 0 0);
  --bg-recessed: oklch(0.10 0 0);
  --bg-surface: oklch(0.18 0 0);
  --bg-raised: oklch(0.24 0 0);
  --bg-highlight: oklch(0.30 0 0);
  --highlight-top: oklch(1 0 0 / 0.10);
  --shadow-color: oklch(0 0 0 / 0.20);
  --shadow-sm: inset 0 1px 0 oklch(1 0 0 / 0.10), 0 2px 4px oklch(0 0 0 / 0.18);
  --shadow-md: inset 0 1px 0 oklch(1 0 0 / 0.12), 0 5px 12px oklch(0 0 0 / 0.20);
  --shadow-lg: inset 0 1px 0 oklch(1 0 0 / 0.14), 0 10px 28px oklch(0 0 0 / 0.22);
  --shadow-inset: inset 0 2px 4px oklch(0 0 0 / 0.30), inset 0 -1px 0 oklch(1 0 0 / 0.06);
}
```

Base is the page; surface holds sections and cards; raised serves important or interactive components; highlight serves selected or high-priority details. Recessed is below its parent. Light mode often uses a slightly darker page with white cards and visible shadows; dark mode relies more on surface brightness and restrained highlights. Do not assume higher lightness always means higher elevation. Confirm theme switching follows the application's conventions and check each shadow and highlight independently in both themes.
