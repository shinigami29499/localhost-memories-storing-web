export type UiResourceStatus = "pending" | "downloading" | "done" | "failed";
export type UiResourceItem = { id: string; name: string; status: UiResourceStatus };
export type ReportUiResource = (item: UiResourceItem) => void;

const modules = new Map<string, { name: string; load: () => Promise<unknown> }>();
let startupPrepared = false;
let initialRoutePrepared = false;
let welcomeUser: string | undefined;

export function registerUiModule<T>(name: string, importer: () => Promise<T>) {
  let promise: Promise<T> | undefined;
  const load = () => promise ??= importer().catch((error: unknown) => {
    promise = undefined;
    throw error;
  });
  modules.set(`module:${modules.size}`, { name, load });
  return load;
}

export async function prepareUiModules(signal: AbortSignal, report: ReportUiResource) {
  const attempted = new Set<string>();
  let successful = true;
  while (!signal.aborted) {
    const batch = [...modules].filter(([id]) => !attempted.has(id));
    if (!batch.length) return successful;
    for (const [id, { name }] of batch) {
      attempted.add(id);
      report({ id, name, status: "pending" });
    }
    for (let start = 0; start < batch.length && !signal.aborted; start += 6) {
      await Promise.all(batch.slice(start, start + 6).map(async ([id, { name, load }]) => {
        report({ id, name, status: "downloading" });
        let status: UiResourceStatus = "done";
        try { await load(); }
        catch { successful = false; status = "failed"; }
        if (!signal.aborted) report({ id, name, status });
      }));
    }
  }
  return false;
}

export function markStartupPrepared() {
  startupPrepared = true;
  initialRoutePrepared = true;
}

export function isStartupPrepared() { return startupPrepared; }

export function takePreparedInitialRoute() {
  const prepared = initialRoutePrepared;
  initialRoutePrepared = false;
  return prepared;
}

export function setStartupWelcome(username?: string) { welcomeUser = username; }

export function takeStartupWelcome() {
  const username = welcomeUser;
  welcomeUser = undefined;
  return username;
}
