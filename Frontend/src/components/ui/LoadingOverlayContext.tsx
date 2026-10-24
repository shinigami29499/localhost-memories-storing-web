import { createContext, useContext, useState, type ReactNode } from "react";

interface LoadingOverlayContextValue {
  isLoading: boolean;
  setLoading: (isLoading: boolean) => void;
}

const LoadingOverlayContext = createContext<LoadingOverlayContextValue | null>(null);

export function useLoadingOverlay() {
  const context = useContext(LoadingOverlayContext);
  if (!context) {
    throw new Error("useLoadingOverlay must be used within a LoadingOverlayProvider");
  }
  return context;
}

interface LoadingOverlayProviderProps {
  children: ReactNode;
}

export function LoadingOverlayProvider({ children }: LoadingOverlayProviderProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoadingOverlayContext.Provider value={{ isLoading, setLoading: setIsLoading }}>
      {children}
    </LoadingOverlayContext.Provider>
  );
}
