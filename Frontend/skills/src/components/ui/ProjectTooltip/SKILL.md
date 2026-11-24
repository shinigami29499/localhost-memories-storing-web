---
name: project-tooltip
description: "Shared presentation for native title hints across the application."
---

`src/components/ui/ProjectTooltip.tsx` mounts in the web and mobile entry points. It shows existing nonempty `title` hints on mouse hover and keyboard-visible focus using `project-tooltip.css`. The popup stays within the viewport and renders inside an open native dialog when necessary. Escape, pointer exit, or focus loss dismisses it. Existing control actions and accessible labels remain owned by their components. Touch does not activate action controls solely to show a hint. Album contributor avatars use the same visual class with their own selection behavior.
