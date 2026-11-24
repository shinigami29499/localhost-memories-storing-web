import { createContext, useCallback, useContext, useLayoutEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useLoadingOverlay } from "../../hooks/useLoadingOverlay";

const PendingFallbacks = createContext<Dispatch<SetStateAction<number>> | null>(null);
const DismissStartup = createContext<(() => void) | null>(null);

export function useDismissStartupOverlay() {
  return useContext(DismissStartup);
}

export function StartupLoadingSignal() {
  const setPending = useContext(PendingFallbacks);
  useLayoutEffect(() => {
    setPending?.((count) => count + 1);
    return () => setPending?.((count) => count - 1);
  }, [setPending]);
  return null;
}

export function StartupLoadingBoundary({ children, renderOverlay }: {
  children: ReactNode;
  renderOverlay: (complete: boolean) => ReactNode;
}) {
  const [pending, setPending] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => setDismissed(true), []);
  const visible = useLoadingOverlay(pending > 0 && !dismissed);
  return <PendingFallbacks.Provider value={setPending}>
    <DismissStartup.Provider value={dismiss}>{children}</DismissStartup.Provider>
    {visible && !dismissed && renderOverlay(pending === 0)}
  </PendingFallbacks.Provider>;
}
