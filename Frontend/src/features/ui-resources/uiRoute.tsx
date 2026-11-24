import { useSyncExternalStore, type ComponentType } from "react";
import { useLoaderData, type LoaderFunctionArgs } from "react-router-dom";
import { prepareUiAssets, routeUiAssets } from "./uiResources";
import { registerUiModule, takePreparedInitialRoute } from "./uiModules";

type RouteProgress = { url: string; loaded: number; total: number };
type Work = {
  snapshot: RouteProgress;
  files: Set<string>;
};
const jobs = new WeakMap<AbortSignal, Work>();
const subscribers = new Set<() => void>();
let active: Work | undefined;
let progress: RouteProgress | undefined;

function publish(job?: Work) {
  if (job && job !== active) return;
  progress = job ? { ...job.snapshot } : undefined;
  for (const subscriber of subscribers) subscriber();
}

function subscribe(subscriber: () => void) {
  subscribers.add(subscriber);
  return () => { subscribers.delete(subscriber); };
}

export function useUiRouteProgress(pathname?: string) {
  const current = useSyncExternalStore(subscribe, () => progress);
  return current?.url === pathname ? current : undefined;
}

function routeWork(request: Request, files: string[]) {
  const { signal } = request;
  let work = jobs.get(signal);
  if (!work) {
    work = {
      snapshot: { url: new URL(request.url).pathname, loaded: 0, total: 0 },
      files: new Set(),
    };
    const job = work;
    jobs.set(signal, job);
    active = job;
    signal.addEventListener("abort", () => {
      if (active === job) {
        active = undefined;
        publish();
      }
    }, { once: true });
  }
  const job = work;
  const missing = files.filter((file) => !job.files.has(file));
  missing.forEach((file) => job.files.add(file));
  job.snapshot.total += missing.length + 1;
  publish(job);
  return {
    missing,
    ready() {
      if (signal.aborted) return;
      job.snapshot.loaded += 1;
      publish(job);
    },
  };
}

function LoadedUiRoute() {
  const Component = useLoaderData() as ComponentType;
  return <Component />;
}

export function uiRoute(file: string, importer: () => Promise<ComponentType>) {
  let resolved: ComponentType | undefined;
  const label = file.replace(/^Mobile|\.tsx$/g, "").replace(/([a-z])([A-Z])/g, "$1 $2");
  const load = registerUiModule(label, async () => {
    resolved = await importer();
    return resolved;
  });

  async function loader({ request }: LoaderFunctionArgs) {
    const { signal } = request;
    signal.throwIfAborted();
    const work = takePreparedInitialRoute()
      ? undefined : routeWork(request, resolved ? [] : routeUiAssets(file));
    let Component = resolved;
    if (!Component) {
      if (work) await prepareUiAssets(work.missing, signal, work.ready).catch(() => undefined);
      signal.throwIfAborted();
      Component = await load();
    }
    signal.throwIfAborted();
    work?.ready();
    return Component;
  }

  return {
    loader,
    Component: LoadedUiRoute,
    shouldRevalidate: ({ currentUrl, nextUrl }: { currentUrl: URL; nextUrl: URL }) =>
      currentUrl.pathname !== nextUrl.pathname,
  };
}
