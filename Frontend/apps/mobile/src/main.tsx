import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/mobile-base.css";
import "./gallery/mobile-album-dialog.css";
import "./media/mobile-photo-picker.css";
import "./gallery/mobile-media-viewer.css";
import "./styles/mobile-base-overrides.css";
import { UiBootstrap } from "@/features/ui-resources/UiBootstrap";
import { App } from "./App";
import { MobileThemeProvider } from "./theme/MobileThemeProvider";
import { installButtonPressMotion } from "@/utils/buttonPressMotion";
import { ProjectTooltip } from "@/components/ui/ProjectTooltip";
import "./styles/mobile-theme-adapter.css";
import "./mobile-shell.css";
import "./mobile-home.css";
import "./mobile-auth.css";
import "./styles/mobile-legacy-surfaces.css";
import "@/styles/primary-button-gradient.css";

installButtonPressMotion();
createRoot(document.getElementById("root")!).render(
  <StrictMode><MobileThemeProvider><UiBootstrap><App /></UiBootstrap><ProjectTooltip /></MobileThemeProvider></StrictMode>,
);
