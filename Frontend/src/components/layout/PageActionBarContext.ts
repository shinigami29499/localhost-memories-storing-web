import { createContext, useContext } from "react";

export const ActionBarContext = createContext<HTMLElement | null>(null);

export function usePageActionBarFooter() {
  return useContext(ActionBarContext)?.parentElement ?? null;
}
