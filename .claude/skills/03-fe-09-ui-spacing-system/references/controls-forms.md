# Controls and forms

Values are illustrative; use existing tokens and conventions. Ordinary text buttons often start with horizontal padding two to three times vertical padding. Icon-only, square, circular, multiline, and vertically stacked buttons need their own proportions and accessible target sizes. Keep associated icons close but distinguish independent actions.

~~~css
.button { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; }
.button-large { padding: 0.75rem 1.5rem; }
.icon-label { display: inline-flex; align-items: center; gap: 0.5rem; }
.form { display: flex; flex-direction: column; gap: 1.5rem; }
.form-heading { display: flex; flex-direction: column; gap: 0.5rem; }
.fields, .radio-options { display: flex; flex-direction: column; gap: 1rem; }
.radio-option { display: flex; align-items: flex-start; gap: 0.5rem; }
.input, .select { min-height: 2.75rem; padding: 0.5rem 1rem; }
.select-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.form-actions { display: flex; justify-content: flex-end; gap: 1rem; }
~~~

Group labels, descriptions, inputs, and errors semantically. Align peer input, dropdown, toggle, and button boundaries or baselines using minimum heights or wrappers; allow validation and multiline content to grow without clipping. Leave room between text, icons, and indicators. The action alignment shown is a common left-to-right desktop convention; preserve existing patterns and reading direction. Stack or expand actions on mobile when needed.
