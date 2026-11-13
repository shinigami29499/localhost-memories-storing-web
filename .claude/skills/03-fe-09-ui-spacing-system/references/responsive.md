# Responsive spacing

Preserve semantic grouping as space shrinks. Reduce outer padding where necessary, keep close relationships legible and separate major groups, and let grids reflow. Do not uniformly scale every gap. Respect existing breakpoints and component conventions; the breakpoint below is illustrative.

~~~css
.page { display: flex; flex-direction: column; gap: 2rem; }
.section { padding: 1.5rem; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: 1rem; }
.action-row { display: flex; justify-content: flex-end; gap: 1rem; flex-wrap: wrap; }
@media (max-width: 40rem) {
  .page { gap: 1.5rem; }
  .section { padding: 1rem; }
  .action-row { flex-direction: column; }
  .action-row > button { width: 100%; }
}
~~~

Inspect multiple viewport widths, long text, zoom, wrapping, and validation messages. Confirm no horizontal overflow, clipped content, or cramped icon labels; maintain accessible touch targets and keyboard operation. Preserve the application's mobile navigation and action ordering.
