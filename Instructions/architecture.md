# Shared Architecture Guide

Stack-specific architecture and implementation rules live in the corresponding overview skills:

- Backend: [`be-a-overview`](../.agents/skills/be-a-overview/SKILL.md), with current project details in [`backend-project-info.md`](../Backend/backend-project-info.md).
- Frontend: [`fe-a-overview`](../.agents/skills/fe-a-overview/SKILL.md), with current project details in [`frontend-project-info.md`](../Frontend/frontend-project-info.md).

## Cross-stack boundaries

ShinigaCim is a React/Vite client over an ASP.NET Core REST API. The frontend calls backend endpoints through its service/API-client layer; backend HTTP endpoints delegate work into business services and infrastructure. Keep responsibilities within the owning stack and use the established boundary rather than coupling the frontend directly to backend implementation details.

The [backend overview](../.agents/skills/be-a-overview/SKILL.md) defines backend project ownership and dependency direction. The [frontend overview](../.agents/skills/fe-a-overview/SKILL.md) defines frontend folder responsibilities and feature co-location.

## Shared configuration

Deployment configuration belongs at the repository root alongside `docker-compose.yml` when that file is present. Add production compose files, Dockerfiles, or infrastructure folders only when required; do not assume planned infrastructure exists.

These guides describe current ownership at a high level. Verify actual paths before making structural changes, and update the relevant overview and project-info guide when approved changes affect documented ownership or file locations.
