# Content and layouts

Use existing layout primitives and tokens. Separate identity, metadata, and actions more than a name and role; give vertically stacked content room to breathe. Comparable cards should align content and padding.

~~~css
.list { display: flex; flex-direction: column; gap: 0.75rem; }
.list-item { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.profile-card { padding: 1.25rem; }
.profile-content { display: flex; flex-direction: column; gap: 0.75rem; }
.profile-identity { display: flex; flex-direction: column; gap: 0.25rem; }
.navigation { display: flex; flex-direction: column; gap: 0.5rem; }
.nav-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: 1rem; }
.card { padding: 1rem; }
.dashboard { display: grid; gap: 2rem; }
.dashboard-section { display: grid; gap: 1rem; padding: 1.5rem; }
.progress-section { display: flex; flex-direction: column; gap: 0.75rem; }
.progress-heading { display: flex; justify-content: space-between; gap: 1rem; }
.page { display: flex; flex-direction: column; gap: 2rem; }
~~~

Use equal columns for comparable choices when appropriate. Matching card padding and grid gap can be balanced but is not required. Keep progress labels and values associated, use proper progress semantics, and let long labels wrap. Do not use large fixed gaps to push actions to an edge.
