import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "@/context/LocaleContext";
import { useAnimationStore } from "@/store/animationStore";
import type { MobilePageTransition } from "./mobilePageNavigation";
import "./mobile-page-loading.css";

const minimumVisibleMs = 300;
const progressStepMs = minimumVisibleMs / 100;
const handoffDuration = 420;
const handoffEase = "cubic-bezier(.4,0,.1,1)";

type Props = {
  transition: MobilePageTransition;
  title: string;
  icon: ReactNode;
  pageRef: RefObject<HTMLDivElement | null>;
  onComplete: (id: number) => void;
};

export function MobilePageLoadingOverlay({ transition, title, icon, pageRef, onComplete }: Props) {
  const { t } = useLocale();
  const cache = useQueryClient().getQueryCache();
  const overlayRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const overlay = overlayRef.current;
    const background = backgroundRef.current;
    const heading = titleRef.current;
    const progressBar = progressRef.current;
    if (!page || !overlay || !background || !heading || !progressBar) return;

    let frame = 0;
    let minTimer = 0;
    let visible = false;
    let minimumElapsed = false;
    let shownPercent = 0;
    let lastStepAt: number | undefined;
    let disposed = false;
    let leaving = false;
    let animations: Animation[] = [];

    const handoff = () => {
      leaving = true;
      transition.stopTracking();
      if (!transition.animateHandoff || !useAnimationStore.getState().enabled) {
        onComplete(transition.id);
        return;
      }
      overlay.dataset.handoff = "";
      const target = page.querySelector<HTMLElement>(".mobile-shell-header .mobile-page-title");
      animations = [background.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: handoffDuration, easing: handoffEase, fill: "forwards",
      })];
      if (target) {
        const from = heading.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        const scale = parseFloat(getComputedStyle(target).fontSize) / parseFloat(getComputedStyle(heading).fontSize);
        const x = to.left - from.left;
        const y = (to.top + to.height / 2) - (from.top + from.height / 2);
        animations.push(heading.animate([
          { transform: "translate(0, 0) scale(1)" },
          { transform: `translate(${x}px, ${y}px) scale(${scale})` },
        ], { duration: handoffDuration, easing: handoffEase, fill: "forwards" }));
      }
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
        if (!disposed) onComplete(transition.id);
      });
    };

    const update = (now: number) => {
      frame = 0;
      const pageReady = !page.querySelector("[data-mobile-page-pending]");
      let total = 1;
      let settled = pageReady ? 1 : 0;
      for (const query of transition.queries) {
        if (!query.isActive()) continue;
        total += 1;
        if (query.state.status !== "pending" || query.state.fetchStatus === "paused") settled += 1;
      }
      const ready = settled === total && minimumElapsed;
      const target = Math.min(ready ? 100 : 99, Math.floor(settled * 100 / total));
      if (shownPercent < target) {
        lastStepAt ??= now;
        const steps = Math.floor((now - lastStepAt) / progressStepMs);
        if (steps > 0) {
          shownPercent = Math.min(target, shownPercent + steps);
          progressBar.setAttribute("aria-valuenow", String(shownPercent));
          progressBar.style.setProperty("--mobile-page-progress", String(shownPercent / 100));
          lastStepAt = shownPercent === target ? undefined : lastStepAt + steps * progressStepMs;
        }
        schedule();
      } else if (ready && shownPercent === 100) {
        handoff();
      } else {
        lastStepAt = undefined;
      }
    };

    function schedule() {
      if (visible && !frame && !leaving) frame = requestAnimationFrame(update);
    }

    const unsubscribe = cache.subscribe((event) => {
      if (transition.queries.has(event.query)) schedule();
    });
    const observer = new MutationObserver(schedule);
    observer.observe(page, { subtree: true, childList: true, attributeFilter: ["data-mobile-page-pending"] });

    const firstFrame = requestAnimationFrame(() => {
      visible = true;
      schedule();
      minTimer = window.setTimeout(() => {
        minimumElapsed = true;
        schedule();
      }, minimumVisibleMs);
    });

    return () => {
      disposed = true;
      unsubscribe();
      observer.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(firstFrame);
      window.clearTimeout(minTimer);
      animations.forEach((animation) => animation.cancel());
    };
  }, [cache, transition, onComplete, pageRef]);

  return (
    <div ref={overlayRef} className="mobile-page-loading">
      <div ref={backgroundRef} className="mobile-page-loading__background" aria-hidden="true" />
      <div className="mobile-page-loading__content">
        <div className="mobile-page-loading__icon" aria-hidden="true">{icon}</div>
        <span ref={titleRef} className="mobile-page-loading__title mobile-page-title" aria-hidden="true">{title}</span>
        <div ref={progressRef} className="mobile-page-loading__progress" role="progressbar"
          aria-label={`${t("Loading page...")} ${title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
          <span />
        </div>
      </div>
    </div>
  );
}
