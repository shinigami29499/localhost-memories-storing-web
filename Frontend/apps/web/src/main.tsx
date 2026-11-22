import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { UiBootstrap } from "@/features/ui-resources/UiBootstrap";
import { App } from "./App";
import { installButtonPressMotion } from "@/utils/buttonPressMotion";
import "../../../src/styles/global.css";

installButtonPressMotion();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UiBootstrap><App /></UiBootstrap>
  </StrictMode>,
);
