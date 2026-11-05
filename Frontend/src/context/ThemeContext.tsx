import { useLayoutEffect, type ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.dataset.theme = "light";
  }, []);

  return children;
}
