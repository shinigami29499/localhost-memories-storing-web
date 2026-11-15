import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import "./mobile-theme.css";

export type MobileThemePreference = "system" | "light" | "dark";
export type MobileColorScheme = "light" | "dark";

const STORAGE_KEY = "shinigacim-mobile-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

interface MobileThemeContextValue {
  preference: MobileThemePreference;
  colorScheme: MobileColorScheme;
  setPreference: (preference: MobileThemePreference) => void;
}

const MobileThemeContext = createContext<MobileThemeContextValue | null>(null);

function readPreference(): MobileThemePreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function systemScheme(): MobileColorScheme {
  return window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

export function MobileThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<MobileThemePreference>(readPreference);
  const [system, setSystem] = useState<MobileColorScheme>(systemScheme);
  const colorScheme = preference === "system" ? system : preference;

  useLayoutEffect(() => {
    document.documentElement.dataset.mobileTheme = colorScheme;
    return () => { delete document.documentElement.dataset.mobileTheme; };
  }, [colorScheme]);

  useEffect(() => {
    try {
      if (preference === "system") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // The selected theme still applies when browser storage is unavailable.
    }
  }, [preference]);

  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY);
    if (!query) return;
    const update = (event: MediaQueryListEvent) => setSystem(event.matches ? "dark" : "light");
    setSystem(query.matches ? "dark" : "light");
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) setPreference(readPreference());
    };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  const value = useMemo(() => ({ preference, colorScheme, setPreference }), [preference, colorScheme]);
  return <MobileThemeContext.Provider value={value}>{children}</MobileThemeContext.Provider>;
}

export function useMobileTheme(): MobileThemeContextValue {
  const context = useContext(MobileThemeContext);
  if (!context) throw new Error("useMobileTheme must be used within MobileThemeProvider");
  return context;
}
