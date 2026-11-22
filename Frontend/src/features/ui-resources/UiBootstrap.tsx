import { Check, Circle, CircleAlert, LoaderCircle } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { LocaleProvider, useLocale } from "@/context/LocaleContext";
import { useAuthStore } from "@/store/authStore";
import { markStartupPrepared, prepareUiModules, setStartupWelcome, type UiResourceItem } from "./uiModules";
import { preloadUi, readSkipUiPreload, registerUiServiceWorker } from "./uiResources";
import "./ui-startup.css";

const statusIcons = { pending: Circle, downloading: LoaderCircle, done: Check, failed: CircleAlert };
const statusLabels = { pending: "Queued", downloading: "Downloading", done: "Done", failed: "Failed" };
const devStartupKey = "shinigacim.ui-startup";

function showDevelopmentStartup() {
  if (!import.meta.env.DEV) return false;
  try { return sessionStorage.getItem(devStartupKey) !== "done"; }
  catch { return true; }
}

function StartupScreen({ items, status, onRetry, onEnter }: {
  items: UiResourceItem[];
  status: "loading" | "ready" | "failed";
  onRetry: () => void;
  onEnter: () => void;
}) {
  const { t } = useLocale();
  return <main className="ui-startup" aria-labelledby="ui-startup-title">
    <section className="ui-startup__panel">
      <h1 id="ui-startup-title">{t("Preparing the app")}</h1>
      <ul className="ui-startup__packages" aria-label={t("Application resources")}>
        {items.map(({ id, name, status: itemStatus }) => {
          const Icon = statusIcons[itemStatus];
          return <li key={id} data-status={itemStatus}>
            <Icon size={18} aria-hidden="true" />
            <span>{t(name)}</span>
            <span className="ui-startup__status">{t(statusLabels[itemStatus])}</span>
          </li>;
        })}
      </ul>
      <footer className="ui-startup__footer" aria-live="polite">
        {status === "ready" && <button type="button" className="btn btn--primary" onClick={onEnter}>{t("Open app")}</button>}
        {status === "failed" && <button type="button" className="btn btn--primary" onClick={onRetry}>{t("Retry")}</button>}
      </footer>
    </section>
  </main>;
}

export function UiBootstrap({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(false);
  const [show, setShow] = useState(false);
  const [items, setItems] = useState<UiResourceItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (import.meta.env.MODE === "test" || readSkipUiPreload()) {
      registerUiServiceWorker();
      setEntered(true);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    let needsEntry = showDevelopmentStartup() || attempt > 0;
    const reveal = () => { needsEntry = true; setShow(true); };
    if (needsEntry) reveal();
    const report = (item: UiResourceItem) => {
      if (!signal.aborted) setItems((current) => {
        const index = current.findIndex(({ id }) => id === item.id);
        if (index < 0) return [...current, item];
        return current.map((previous) => previous.id === item.id ? item : previous);
      });
    };
    const cancel = (event: PageTransitionEvent) => { if (!event.persisted) controller.abort(); };
    window.addEventListener("pagehide", cancel);
    void (async () => {
      const assetsReady = await preloadUi(signal, reveal, report);
      if (signal.aborted) return;
      registerUiServiceWorker();
      const modulesReady = assetsReady && await prepareUiModules(signal, report);
      if (signal.aborted) return;
      if (modulesReady) markStartupPrepared();
      if (!needsEntry) setEntered(true);
      else setStatus(modulesReady ? "ready" : "failed");
    })();
    return () => { controller.abort(); window.removeEventListener("pagehide", cancel); };
  }, [attempt]);

  const enter = () => {
    const { accessToken, user } = useAuthStore.getState();
    window.history.replaceState(window.history.state, "", accessToken ? "/" : "/login");
    if (accessToken && user) setStartupWelcome(user.username);
    try { if (import.meta.env.DEV) sessionStorage.setItem(devStartupKey, "done"); }
    catch { /* Storage is optional for startup. */ }
    setEntered(true);
  };

  if (entered) return children;
  if (!show) return null;
  return <LocaleProvider><StartupScreen items={items} status={status} onEnter={enter}
    onRetry={() => { setItems([]); setStatus("loading"); setAttempt((value) => value + 1); }} /></LocaleProvider>;
}
