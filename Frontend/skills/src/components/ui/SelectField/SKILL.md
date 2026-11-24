---
name: select-field
description: "Render a labeled single-value field with optional indicators beside its options."
---

`Frontend/src/components/ui/SelectField.tsx` renders a controlled single-select field. Each option has a value, a text label, and an optional accessible indicator label. When provided, the indicator renders as a dot beside the option and beside the matching selected value. The text label remains the value used for option matching. Callers can provide a portal container to keep the option list inside a native dialog. Selection calls the supplied callback for non-null values. With `centerSelectedOnOpen`, opening centers the selected option within the popup when the available scroll range allows it.
