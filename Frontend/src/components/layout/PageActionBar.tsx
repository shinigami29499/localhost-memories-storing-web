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

function animateMobileExit(footer: HTMLElement, bar: HTMLElement, bounds: { left: number; top: number; width: number; height: number }, nextHeight: number) {
  const wrapper = document.createElement("div");
  wrapper.dataset.collapsingBar = "true";
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.inert = true;
  Object.assign(wrapper.style, {
    position: "absolute", right: "12px",
    bottom: `${footer.clientHeight - bounds.top - bounds.height}px`,
    width: `${bounds.width}px`, height: `${bounds.height}px`,
    display: "flex", alignItems: "flex-end", justifyContent: "flex-end", overflow: "hidden", pointerEvents: "none", zIndex: "2",
    boxSizing: "border-box", border: "2.25px solid var(--surface)", borderRadius: "var(--control-radius)", background: "var(--accent)",
  });
  const exiting = bar.cloneNode(true) as HTMLElement;
  Object.assign(exiting.style, { flex: "none", width: "100%", maxWidth: "none", border: "0", borderRadius: "0" });
  wrapper.append(exiting);
  footer.append(wrapper);
  const frames = nextHeight > 0
    ? [{ height: `${bounds.height}px` }, { height: `${nextHeight}px` }]
    : [{ width: `${bounds.width}px` }, { width: "0px" }];
  wrapper.animate(frames, { duration: 200, easing: "ease-out" }).onfinish = () => wrapper.remove();
}

function animateMobileExpand(bar: HTMLElement, previousHeight: number, nextHeight: number) {
  bar.animate([{ height: `${previousHeight}px`, overflow: "hidden" }, { height: `${nextHeight}px`, overflow: "hidden" }],
    { duration: 200, easing: "ease-out" });
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
    let replacedBar: HTMLElement | null = null;
    let pendingMobileExit: { bar: HTMLElement; bounds: typeof snapshotBounds; timer: number } | null = null;
    let snapshotBounds = { left: 0, top: 0, width: 0, height: 0 };
    const transitions = new MutationObserver(() => {
      if (!footer.hasAttribute("data-location-view-transition")) return;
      if (pendingMobileExit) window.clearTimeout(pendingMobileExit.timer);
      pendingMobileExit = null;
      footer.querySelector(":scope > [data-collapsing-bar]")?.remove();
      target.querySelector(":scope > [data-exiting]")?.remove();
    });
    transitions.observe(footer, { attributes: true, attributeFilter: ["data-location-view-transition"] });
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
        snapshotBounds = { left: rect.left - footerRect.left, top: rect.top - footerRect.top, width: rect.width, height: rect.height };
      } else {
        snapshot = null;
        snapshotWidth = 0;
      }
      setWidth(measuredWidth);
    };
    const changes = new MutationObserver((records) => {
      const bar = target.querySelector(":scope > .gallery-selection-bar:not([data-exiting])");
      if (enabled && !footer.hasAttribute("data-location-view-transition")) {
        const removed = records.flatMap((record) => Array.from(record.removedNodes))
          .find((node): node is HTMLElement => node instanceof HTMLElement && node.classList.contains("gallery-selection-bar") && !node.hasAttribute("data-exiting"));
        const added = records.flatMap((record) => Array.from(record.addedNodes))
          .find((node): node is HTMLElement => node instanceof HTMLElement && node.classList.contains("gallery-page__actions"));
        const nextWidth = bar?.getBoundingClientRect().width ?? 0;
        const mobileGalleryExit = removed?.classList.contains("gallery-page__actions") && window.matchMedia("(max-width: 767px)").matches;
        const completingMobileSwap = Boolean(removed && removed === replacedBar);
        if (completingMobileSwap) replacedBar = null;
        if (nextWidth > 0 && !completingMobileSwap) footer.querySelector(":scope > [data-collapsing-bar]")?.remove();
        const mobileOverlap = added?.classList.contains("map-navigation__toolbar") && observedBar?.classList.contains("map-navigation__toolbar")
          && observedBar !== added && !removed && snapshot && window.matchMedia("(max-width: 767px)").matches
          && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const pendingReplacement = added?.classList.contains("map-navigation__toolbar") && pendingMobileExit;
        if (pendingReplacement && added) {
          window.clearTimeout(pendingReplacement.timer);
          pendingMobileExit = null;
          const nextHeight = added.getBoundingClientRect().height;
          if (pendingReplacement.bounds.height > nextHeight) {
            animateMobileExit(footer, pendingReplacement.bar, pendingReplacement.bounds, nextHeight);
          } else if (nextHeight > pendingReplacement.bounds.height) {
            animateMobileExpand(added, pendingReplacement.bounds.height, nextHeight);
          }
        } else if (mobileOverlap && added && snapshot) {
          replacedBar = observedBar;
          const nextHeight = added.getBoundingClientRect().height;
          if (snapshotBounds.height > nextHeight) {
            animateMobileExit(footer, snapshot, snapshotBounds, nextHeight);
          } else if (nextHeight > snapshotBounds.height) {
            animateMobileExpand(added, snapshotBounds.height, nextHeight);
          }
        } else if (completingMobileSwap) {
          // The replacement already animated when it was inserted.
        } else if (mobileGalleryExit) {
          footer.querySelector(":scope > [data-collapsing-bar]")?.remove();
          target.querySelector(":scope > [data-exiting]")?.remove();
          const nextHeight = bar?.classList.contains("gallery-page__actions") ? bar.getBoundingClientRect().height : 0;
          if (removed?.classList.contains("map-navigation__toolbar") && snapshot && !bar && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const exitingBar = snapshot;
            const exitingBounds = snapshotBounds;
            const timer = window.setTimeout(() => {
              pendingMobileExit = null;
              if (!footer.hasAttribute("data-location-view-transition")) animateMobileExit(footer, exitingBar, exitingBounds, 0);
            }, 80);
            pendingMobileExit = { bar: exitingBar, bounds: exitingBounds, timer };
          } else if (snapshot && snapshotBounds.height > nextHeight && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            animateMobileExit(footer, snapshot, snapshotBounds, nextHeight);
          } else if (bar && snapshot && nextHeight > snapshotBounds.height && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            animateMobileExpand(bar as HTMLElement, snapshotBounds.height, nextHeight);
          }
        } else if (removed && !removed.classList.contains("place__action-bar") && snapshot && snapshotWidth > nextWidth && nextWidth === 0) {
          animateExit(footer, snapshot, snapshotBounds);
        } else if (removed && !removed.classList.contains("place__action-bar") && snapshot && snapshotWidth > nextWidth) {
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
        if (!pendingReplacement && !mobileOverlap && added?.classList.contains("map-navigation__toolbar") && !removed?.classList.contains("gallery-page__actions")
          && window.matchMedia("(max-width: 767px)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          added.animate([{ clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 200, easing: "ease-out" });
        }
      }
      measure();
    });
    changes.observe(target, { childList: true });
    measure();
    return () => { changes.disconnect(); transitions.disconnect(); resize?.disconnect(); if (pendingMobileExit) window.clearTimeout(pendingMobileExit.timer); };
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
