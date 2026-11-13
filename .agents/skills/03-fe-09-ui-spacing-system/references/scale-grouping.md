# Scale and grouping

Reuse the project's scale first. Otherwise, use these starting points at a 16px root: 0.25rem (4px), 0.5rem (8px), 0.75rem (12px), 1rem (16px), 1.25rem (20px), 1.5rem (24px), and 2rem (32px). Values are flexible, not a mandate to replace existing tokens.

Group heading and description closely; separate controls, actions, and major sections more clearly. Start a section or card at 2rem padding and reduce to 1.5rem or 1rem when density calls for it. Keep inner gaps generally no larger than container padding, except when distinct content warrants it.

~~~css
.page { display: flex; flex-direction: column; gap: 2rem; }
.section { padding: 1.5rem; }
.heading-group { display: flex; flex-direction: column; gap: 0.5rem; }
.section-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
~~~

Use opposite-edge alignment only where the relationship calls for it; wrap or stack rather than overflow. Padding and neighboring gaps can match as a starting point, but need not. For rounded nested surfaces, balance outer radius, inner radius, and padding visually; radius need not equal padding.
