---
name: 03-fe-06-remotion-create
description: Create a new Remotion video
version: 4.0.543
---

Create a Remotion project or composition.

## Scaffold

If a project already exists, skip scaffolding. Inspect the current folder, including hidden files, before choosing where to create a project. Preserve meaningful contents such as `.env` and `.git`. For an empty folder, run `npx create-video@latest --yes --blank --no-tailwind .`; for a non-empty folder without a project, create a suitable subfolder.

## Preview

As soon as the project can run, open [Remotion Studio](../03-fe-06-remotion-studio/SKILL.md) before writing or changing the composition. Keep it open while working.

## Design

Follow [Remotion Markup Best Practices](../03-fe-06-remotion-markup/SKILL.md) and [Interactivity Best Practices](../03-fe-06-remotion-interactivity/SKILL.md). Before registering compositions or stills, keep each independently editable item as an authored JSX node with inline metadata and defaults. For clip timelines, give each independently editable clip its own JSX node.
