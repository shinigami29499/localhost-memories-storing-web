# Code Conventions

## Naming

- Use descriptive names and consistent domain terminology.
- Backend: PascalCase for types, methods, properties, and enum members; camelCase for parameters and local variables.
- Prefix interfaces with `I`, such as `IPostService` and `IMapper`. Name implementations by responsibility, such as `PostService` and `Mapper`.
- Suffix asynchronous methods with `Async`, DTOs with `Dto`, and service input/output contracts with `Request` or `Response`.
- Name each C# file after its primary type. Put each entity, interface, and implementation in a separate file.
- Frontend: PascalCase for React components and types, camelCase for functions and variables, and `use` prefixes for hooks. Follow existing feature-folder naming.
- Use short project, folder, assembly, and C# namespace names without the `ShinigaCim` prefix. Preserve product branding, including the `ShinigaCim.sln` solution filename. The restricted `ShinigaCim.Infrastructure.Security` namespace and its required references are exempt; do not edit the restricted source. If Windows denies a containing-folder rename, keep project references valid at the existing path rather than copying restricted files.

## Backend Classes and Mapping

- Always use C# primary constructors for backend classes needing constructor parameters, including dependency injection. Do not introduce explicit constructors for dependency assignment.
- Do not add empty constructors to classes that do not need constructor parameters.
- Introduce and use `IMapper` for entity/DTO/request/response transformations instead of scattering mapping logic across controllers and services.
- Keep the mapper interface and implementation in separate `Interfaces` and `Implementations` folders in the owning project. Put mapping definitions in `Service/Mappings`.
- Reuse an existing mapping abstraction or library when present. Do not add a package solely to satisfy the `IMapper` name.

## Comments

- Comment only to communicate a necessary concrete fact, such as a useful function summary or a non-obvious constraint.
- Keep comments as short as possible.
- Avoid redundant narration, speculation, conversational notes, change history, decorative headings, and commented-out code.

See [architecture](architecture.md) for file placement and [overview](overview.md#backend-validation-no-tests) for the backend test prohibition.
