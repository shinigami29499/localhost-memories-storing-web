import { useLayoutEffect, useState, type CSSProperties } from "react";
import { UI_TIMING } from "../config/uiTiming";

interface ViewportBounds {
  left: number;
  width: number;
}

function getMainBounds(): ViewportBounds {
  const main = document.querySelector<HTMLElement>(".app-shell__main");
  if (!main) return { left: 0, width: window.innerWidth };
  const { left, width } = main.getBoundingClientRect();
  return { left, width };
}

export function useDialogViewportStyle(): CSSProperties {
  const [bounds, setBounds] = useState<ViewportBounds>(() => getMainBounds());

  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>(".app-shell__main");
    if (!main) return;

    const update = () => {
      const next = getMainBounds();
      setBounds((current) => current.left === next.left && current.width === next.width ? current : next);
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleUpdate = () => {
      clearTimeout(timer);
      timer = setTimeout(update, UI_TIMING.RESIZE_DEBOUNCE);
    };
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(main);
    window.addEventListener("resize", scheduleUpdate);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      clearTimeout(timer);
    };
  }, []);

  return {
    boxSizing: "border-box",
    left: bounds.left,
    right: "auto",
    width: bounds.width,
  };
}
