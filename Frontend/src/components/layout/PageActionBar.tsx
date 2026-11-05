import { useContext, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { HTMLAttributes, ReactNode } from "react";
import { motion } from "motion/react";
import { useAnimationStore } from "../../store/animationStore";
import { ActionBarContext } from "./PageActionBarContext";
import "../../pages/gallery/gallery.css";

export { usePageActionBarFooter } from "./PageActionBarContext";

function animateExit(footer: HTMLElement, bar: HTMLElement, bounds: { left: number; top: number; width: number; height: number }) {
  footer.querySelector(":scope > [data-collapsing-bar]")?.remove();
  const wrapper = document.createElement("div");
  wrapper.dataset.collapsingBar = "true";
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.inert = true;
  Object.assign(wrapper.style, {
    position: "absolute", left: `${bounds.left + bounds.width / 2}px`, top: `${bounds.top}px`,
    width: `${bounds.width}px`, height: `${bounds.height}px`, transform: "translateX(-50%)",
    display: "flex", justifyContent: "center", overflow: "hidden", pointerEvents: "none", zIndex: "0",
  });
  const exiting = bar.cloneNode(true) as HTMLElement;
  exiting.style.width = `${bounds.width}px`;
  exiting.style.flex = "none";
  wrapper.append(exiting);
  footer.append(wrapper);
  const animation = wrapper.animate(
    [
      { width: `${bounds.width}px`, opacity: 1, offset: 0 },
      { width: `${bounds.width * 0.15}px`, opacity: 1, offset: 0.85 },
      { width: `${bounds.width * 0.05}px`, opacity: 0, offset: 0.95 },
      { width: "0px", opacity: 0, offset: 1 },
    ],
    { duration: 200, easing: "ease-out" },
  );
  animation.onfinish = () => wrapper.remove();
}

export function PageActionBarProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const enabled = useAnimationStore((state) => state.enabled);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!target) return;
    const footer = target.parentElement;
    if (!footer) return;
    let observedBar: HTMLElement | null = null;
    let measuredWidth = 0;
    let snapshotWidth = 0;
    let snapshot: HTMLElement | null = null;
    let snapshotBounds = { left: 0, top: 0, width: 0, height: 0 };
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
      if (bar && measuredWidth > 0) {
        snapshot = bar.cloneNode(true) as HTMLElement;
        snapshotWidth = measuredWidth;
        const rect = bar.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        snapshotBounds = { left: (footerRect.width - rect.width) / 2, top: rect.top - footerRect.top, width: rect.width, height: rect.height };
      }
      setWidth(measuredWidth);
    };
    const changes = new MutationObserver((records) => {
      const bar = target.querySelector(":scope > .gallery-selection-bar:not([data-exiting])");
      if (enabled) {
        const removed = records.flatMap((record) => Array.from(record.removedNodes))
          .find((node): node is HTMLElement => node instanceof HTMLElement && node.classList.contains("gallery-selection-bar") && !node.hasAttribute("data-exiting"));
        const nextWidth = bar?.getBoundingClientRect().width ?? 0;
        if (nextWidth > 0) footer.querySelector(":scope > [data-collapsing-bar]")?.remove();
        if (removed && snapshot && snapshotWidth > nextWidth && nextWidth === 0) {
          animateExit(footer, snapshot, snapshotBounds);
        } else if (removed && snapshot && snapshotWidth > nextWidth) {
          target.querySelector(":scope > [data-exiting]")?.remove();
          const exiting = snapshot;
          exiting.dataset.exiting = "true";
          exiting.setAttribute("aria-hidden", "true");
          exiting.inert = true;
          exiting.style.width = `${snapshotWidth}px`;
          target.append(exiting);
          exiting.animate(
            [{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.85 }, { opacity: 0, offset: 0.95 }, { opacity: 0, offset: 1 }],
            { duration: 200, easing: "ease-out", fill: "forwards" },
          );
        } else if (removed && snapshotWidth <= nextWidth) {
          target.querySelector(":scope > [data-exiting]")?.remove();
        }
      }
      measure();
    });
    changes.observe(target, { childList: true });
    measure();
    return () => { changes.disconnect(); resize?.disconnect(); };
  }, [target, enabled]);

  return <ActionBarContext.Provider value={target}>
    {children}
    <footer className="gallery-page__footer page-action-bar">
      <motion.div className="page-action-bar__item" animate={{ width, opacity: width > 0 ? 1 : 0 }}
        transition={{ duration: enabled ? 0.2 : 0, ease: "easeOut" }}
        onAnimationComplete={() => {
          if (target && Math.abs(target.getBoundingClientRect().width - width) < 0.5) {
            target.querySelector(":scope > [data-exiting]")?.remove();
          }
        }}
        ref={setTarget} />
    </footer>
  </ActionBarContext.Provider>;
}

export function PageActionBar({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  const target = useContext(ActionBarContext);
  const bar = <div {...props} className={`gallery-selection-bar gallery-selection-bar--compact ${className}`} />;
  return target ? createPortal(bar, target) : null;
}
