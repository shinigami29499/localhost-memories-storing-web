# Shadow and lighting recipes

Use small elevation for navigation, small cards, buttons, and selected options; medium for cards, dropdowns, interactive panels, and hovered cards; large for floating panels, popovers, and dialogs. Increase offset, blur, or spread gradually. Size alone does not determine shadow level. Use large shadows sparingly and combine a soft top highlight with a darker exterior shadow instead of relying on one large shadow.

```css
.raised-surface {
  background: linear-gradient(180deg, var(--bg-highlight), var(--bg-surface));
  box-shadow: inset 0 1px 0 var(--highlight-top), 0 4px 10px var(--shadow-color);
}
.recessed-surface {
  background: var(--bg-recessed);
  box-shadow: var(--shadow-inset);
}
.interactive-card {
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 180ms ease, background-color 180ms ease;
}
@media (hover: hover) {
  .interactive-card:hover { box-shadow: var(--shadow-md); }
}
@media (prefers-reduced-motion: reduce) {
  .interactive-card { transition: none; }
}
```

Overhead light makes the top slightly brighter and casts shadow underneath. Keep gradients and highlights subtle. Recessed surfaces invert the cue: dark inset on top, light inset below. Use them for secondary regions, tables, tracks, or control containers, but retain sufficient contrast so they do not look disabled. Hover should extend the default elevation naturally, often especially visible in light mode; avoid excessive scale or movement. Never place functionality behind hover alone. Preserve visible keyboard focus and touch access.
