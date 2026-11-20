# Elevation tokens

Reuse existing semantic tokens first. These illustrative values are starting points, not certified contrast combinations. Tune separately against actual adjacent surfaces and rendered text. Three or four coordinated shades are often enough. In OKLCH, try around 0.1 lightness difference while exploring, then adjust; these dark examples use 0.06 increments.

```css
:root {
  --bg-base: oklch(0.94 0 0);
  --bg-recessed: oklch(0.92 0 0);
  --bg-surface: oklch(0.97 0 0);
  --bg-raised: oklch(1 0 0);
  --bg-highlight: oklch(1 0 0);
  --border-surface: #e8e6e3;
  --shadow-sm: 0 -1px 4px rgb(0 0 0 / .04), 0 3px 8px rgb(0 0 0 / .10);
  --shadow-md: 0 -1px 6px rgb(0 0 0 / .04), 0 5px 12px rgb(0 0 0 / .10);
  --shadow-lg: 0 -2px 10px rgb(0 0 0 / .08), 0 7px 18px rgb(0 0 0 / .18);
  --shadow-inset: inset 0 5px 12px rgb(0 0 0 / .10), inset 0 -1px 6px rgb(255 255 255 / .12);
}
[data-theme="dark"] {
  --bg-base: oklch(0.12 0 0);
  --bg-recessed: oklch(0.10 0 0);
  --bg-surface: oklch(0.18 0 0);
  --bg-raised: oklch(0.24 0 0);
  --bg-highlight: oklch(0.30 0 0);
  --border-surface: #484848;
  --shadow-sm: 0 -1px 4px rgb(0 0 0 / .08), 0 3px 8px rgb(0 0 0 / .16);
  --shadow-md: 0 -1px 6px rgb(0 0 0 / .12), 0 5px 12px rgb(0 0 0 / .24);
  --shadow-lg: 0 -2px 10px rgb(0 0 0 / .15), 0 7px 18px rgb(0 0 0 / .28);
  --shadow-inset: inset 0 5px 12px rgb(0 0 0 / .24), inset 0 -1px 6px rgb(255 255 255 / .12);
}
```

Base is the page. Surface holds sections and cards. Raised serves elevated components. Highlight serves selected or high-priority details. Recessed sits below its parent. In both themes, verify soft shadows against adjacent surfaces. In dark mode, use a uniform border lighter than the fill on bordered boxes.
