import { createContext, useContext, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { HTMLAttributes, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useAnimationStore } from "../../store/animationStore";
import "../../pages/gallery/gallery.css";

const ActionBarContext = createContext<HTMLElement | null>(null);

export function PageActionBarProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const enabled = useAnimationStore((state) => state.enabled);
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!target) return;
    const footer = target.parentElement;
    if (!footer) return;
    let observedBar: HTMLElement | null = null;
    let measuredWidth = 0;
    let snapshot: HTMLElement | null = null;
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => measure());
    resize?.observe(footer);
    const measure = () => {
      const bar = target.querySelector<HTMLElement>(":scope > .gallery-selection-bar:not([data-exiting])");
      target.style.setProperty("--page-action-bar-max-width", `${Math.max(0, footer.clientWidth - 32)}px`);
      if (bar !== observedBar) {
        if (observedBar) resize?.unobserve(observedBar);
        if (bar) resize?.observe(bar);
        observedBar = bar;
      }
      measuredWidth = bar ? bar.getBoundingClientRect().width : 0;
      if (bar && measuredWidth > 0) snapshot = bar.cloneNode(true) as HTMLElement;
      setWidth(measuredWidth);
    };
    const changes = new MutationObserver((records) => {
      const bar = target.querySelector(":scope > .gallery-selection-bar:not([data-exiting])");
      if (enabled && !reducedMotion) {
        const removed = records.flatMap((record) => Array.from(record.removedNodes))
          .find((node): node is HTMLElement => node instanceof HTMLElement && node.classList.contains("gallery-selection-bar") && !node.hasAttribute("data-exiting"));
        const nextWidth = bar?.getBoundingClientRect().width ?? 0;
        if (removed && snapshot && measuredWidth > nextWidth) {
          target.querySelector(":scope > [data-exiting]")?.remove();
          const exiting = snapshot;
          exiting.dataset.exiting = "true";
          exiting.setAttribute("aria-hidden", "true");
          exiting.inert = true;
          exiting.style.width = `${measuredWidth}px`;
          target.append(exiting);
        } else if (removed) {
          target.querySelector(":scope > [data-exiting]")?.remove();
        }
      }
      measure();
    });
    changes.observe(target, { childList: true });
    measure();
    return () => { changes.disconnect(); resize?.disconnect(); };
  }, [target, enabled, reducedMotion]);

  return <ActionBarContext.Provider value={target}>
    {children}
    <footer className="gallery-page__footer page-action-bar">
      <motion.div className="page-action-bar__item" animate={{ width }}
        transition={{ duration: enabled && !reducedMotion ? 0.2 : 0, ease: "easeOut" }}
        onAnimationComplete={() => { target?.querySelector("[data-exiting]")?.remove(); }}
        ref={setTarget} />
    </footer>
  </ActionBarContext.Provider>;
}

export function PageActionBar({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  const target = useContext(ActionBarContext);
  const bar = <div {...props} className={`gallery-selection-bar gallery-selection-bar--compact ${className}`} />;
  return target ? createPortal(bar, target) : bar;
}
