import { useAuthStore } from "../../store/authStore";

export const sessionReplacedEvent = "shinigacim:session-replaced";

export function endReplacedSession(expectedToken: string | null) {
  if (!expectedToken || useAuthStore.getState().accessToken !== expectedToken) return;
  const saved = localStorage.getItem("shinigacim-auth");
  let newerSession = false;
  try {
    const persisted = saved ? JSON.parse(saved) as { state?: { accessToken?: string | null } } : null;
    newerSession = !!persisted?.state?.accessToken && persisted.state.accessToken !== expectedToken;
  } catch { /* Ignore malformed persisted state. */ }
  useAuthStore.getState().clear();
  if (newerSession && saved) localStorage.setItem("shinigacim-auth", saved);
  window.dispatchEvent(new Event(sessionReplacedEvent));
}
