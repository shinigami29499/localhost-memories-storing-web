# Frontend Project Reference

Use the [frontend overview skill](../.agents/skills/03-fe-01-readfirst/SKILL.md) for architecture, conventions, and validation guidance. Paths below are relative to `Frontend/`.

## Source map

| Area                    | Path                             | Responsibility                                          |
| ----------------------- | -------------------------------- | ------------------------------------------------------- |
| Entry point             | `src/main.tsx`                   | Application startup                                     |
| App and routing         | `src/App.tsx`                    | Providers, routes, and route guards                     |
| Pages                   | `src/pages/`                     | Route-level screens                                     |
| Features                | `src/features/`                  | Feature-specific components, hooks, services, and state |
| Shared components       | `src/components/`                | Reusable UI and layouts                                 |
| Shared hooks            | `src/hooks/`                     | Cross-feature React behavior                            |
| Context and state       | `src/context/`, `src/store/`     | Shared providers and client state                       |
| API client              | `src/services/api.ts`            | Shared API requests and session handling                |
| Utilities               | `src/utils/`, `src/lib/`         | Shared helpers                                          |
| Styles                  | `src/styles/`                    | Global tokens and shared styles                         |
| Assets and public files | `src/assets/`, `public/`         | Bundled assets and public application files             |
| Build and tooling       | `package.json`, `vite.config.ts` | Scripts, build configuration, and development proxy     |

## General flow

The entry point starts the app. Routes render pages, which compose features and shared components. Feature hooks and services manage behavior and call the shared API client. Context and stores hold shared client state; the API supplies server data.
