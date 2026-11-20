# Shadow and lighting recipes

Use small elevation for floating navigation and small raised cards, medium for dropdowns and interactive panels, and large for floating panels and dialogs. Keep both exterior shadows soft, with a shorter shadow above and a slightly longer shadow below. Same-layer items use a distinct fill without a border or shadow.

```css
.raised-surface {
  background: var(--bg-raised);
  border: 1px solid var(--border-surface);
  box-shadow: var(--shadow-md);
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

Keep bordered surfaces even across all edges. Recessed surfaces use a longer dark inset above and a shorter light inset below. Match their blur and length to the exterior pair. When a selection becomes raised, use the shorter exterior shadow above and the longer one below. Preserve visible keyboard focus and touch access.
