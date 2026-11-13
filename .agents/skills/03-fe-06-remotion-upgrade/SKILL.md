---
name: 03-fe-06-remotion-upgrade
description: Upgrade Remotion, related packages, and installed Remotion skills
version: 4.0.543
---

1. Inspect project manifests and lockfiles to identify package manager and workspaces. Preserve unrelated changes.
2. If `@remotion/cli` is installed, run `npx remotion upgrade`; it also updates project-local Remotion skills.
3. Otherwise, upgrade all `remotion` and `@remotion/*` packages to one exact stable version, following the package manager and workspace conventions. Align auxiliary packages with that version's `@remotion/studio` dependencies, update the lockfile, and update installed Remotion skills with `npx skills update`.
4. Review manifest and lockfile changes. If the CLI is available, run `npx remotion versions`.

See releases for changes: https://github.com/remotion-dev/remotion/releases
