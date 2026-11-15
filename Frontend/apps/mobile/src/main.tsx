import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import "./styles/mobile-base.css";
import "./gallery/mobile-album-dialog.css";
import "./media/mobile-photo-picker.css";
import "./gallery/mobile-media-viewer.css";
import "./styles/mobile-base-overrides.css";
import { App } from "./App";
import { MobileThemeProvider } from "./theme/MobileThemeProvider";
import "./styles/mobile-theme-adapter.css";
import "./mobile-home.css";
import "./mobile-shell.css";
import "./mobile-auth.css";
import "./styles/mobile-legacy-surfaces.css";

if (import.meta.env.PROD && !Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch((error: unknown) => console.error("Service worker registration failed:", error));
}

createRoot(document.getElementById("root")!).render(<StrictMode><MobileThemeProvider><App /></MobileThemeProvider></StrictMode>);
