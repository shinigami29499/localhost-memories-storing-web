# Target Architecture

This defines project ownership. The main backend split is implemented; see the [code map](code-map.md) for exact locations and remaining policy-restricted source. Do not rename or move projects unless the task requests it.

## Backend Ownership

| Project folder | Owns                                                                           |
| -------------- | ------------------------------------------------------------------------------ |
| `Api`          | Controllers, HTTP handling, middleware, configuration, application composition |
| `Service`      | Business services, request/response contracts, mapping definitions             |
| `Domain`       | Entities, domain base classes, domain enums                                    |
| `Data`         | EF Core DbContext, persistence, migrations                                     |
| `Adapter`      | External integrations and filesystem storage                                   |

`Service` is a separate class-library project alongside `Data` and `Domain`, not a folder inside `Api`. HTTP identity resolution stays in `Api/Implementations`, implementing the service-layer identity contract.

```text
Backend/
  ShinigaCim.sln
  Api/
    Controllers/
    Middleware/
    Implementations/
  Service/
    Interfaces/
    Implementations/
    Models/
    Requests/
    Responses/
    Mappings/
  Domain/
    Entities/
    Enums/
  Data/
    Migrations/
  Adapter/
  Scripts/
```

- Keep dependencies directed toward lower layers. `Service` must not reference `Api`; `Domain` must not depend on application or infrastructure projects.
- Put each entity in its own class/file under `Domain/Entities`, not a combined entity source file.
- Put interfaces and implementations in separate files and separate `Interfaces` and `Implementations` folders within their owning project or feature.
- `Model`/`Models` folders contain DTOs only, not requests, responses, entities, or exceptions. Use `Service/Models` for service DTOs.
- Put service input/output contracts under `Service/Requests` and `Service/Responses`; group by feature when useful.
- Do not add another `Backend/src` layer or retain long project folder prefixes solely to match older documentation.
- The Infrastructure project folder may be renamed to `Adapter` when requested. Update folder-path references, but do not read, edit, or move individual files under its restricted `Security` directory or access restricted helper scripts.
- `Service` uses the ASP.NET Core framework reference for the existing `IFormFile` upload contract; it does not reference the `Api` project.

## Frontend Ownership

```text
Frontend/
  src/
    components/
      ui/
      layout/
      feed/
    pages/
    services/
    store/
    hooks/
    utils/
    styles/
    types/
```

- `components`: reusable UI, layout, and feature components.
- `pages`: routed screens, grouped by feature.
- `services`: API client and resource calls.
- `store`: shared Zustand state; `hooks`: reusable React behavior and query hooks.
- `utils`, `styles`, and `types`: helpers, stylesheets, and TypeScript definitions.
- Keep Vite configuration, dependency manifests, and frontend environment configuration at the frontend root.

## Shared Configuration

Root deployment configuration belongs alongside [docker-compose.yml](../../docker-compose.yml). Add production compose files, Dockerfiles, or infrastructure folders only when required; the old structure document included planned items that are not guaranteed to exist.
