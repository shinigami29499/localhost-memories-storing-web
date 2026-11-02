import { useLayoutEffect, useState, type CSSProperties } from "react";

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
    const observer = new ResizeObserver(update);
    observer.observe(main);
    window.addEventListener("resize", update);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return {
    boxSizing: "border-box",
    left: bounds.left,
    right: "auto",
    width: bounds.width,
  };
}
