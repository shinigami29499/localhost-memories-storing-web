import { Spinner } from "./Status";
import type { ReactNode } from "react";

interface LoadingOverlayProps {
  isLoading: boolean;
  children?: ReactNode;
}

export function LoadingOverlay({ isLoading, children }: LoadingOverlayProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div
      className="loading-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(28, 31, 36, 0.4)",
      }}
      role="status"
      aria-label="Loading..."
    >
      <Spinner label="Loading content…" />
    </div>
  );
}
