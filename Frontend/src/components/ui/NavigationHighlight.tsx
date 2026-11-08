import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Highlight } from "@animate-ui/react/primitives/effects/highlight";
import { motionTokens } from "@animate-ui/react/utils/motion";
import { useAnimationStore } from "../../store/animationStore";
import "./NavigationHighlight.css";

export function NavigationHighlight({ value, children }: { value: string; children: ReactNode }) {
  const enabled = useAnimationStore((state) => state.enabled);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const overlay = overlayRef.current;
    const navigation = wrapper?.querySelector<HTMLElement>(".navigation-highlight");
    if (!wrapper || !overlay || !navigation) return;

    const copy = navigation.cloneNode(true) as HTMLElement;
    copy.querySelectorAll(".navigation-highlight__indicator").forEach((indicator) => indicator.remove());
    overlay.replaceChildren(copy);

    let frame = 0;
    let previous = "";
    let stableFrames = 0;
    const syncLabels = () => {
      const sourceLabels = navigation.querySelectorAll<HTMLElement>("[data-swap-label]");
      const overlayLabels = overlay.querySelectorAll<HTMLElement>("[data-swap-label]");
      sourceLabels.forEach((source, index) => {
        const target = overlayLabels[index];
        if (!target) return;
        const clone = source.cloneNode(true) as HTMLElement;
        const sourceParts = source.querySelectorAll<HTMLElement>("[data-slot^=swapping-text]");
        const cloneParts = clone.querySelectorAll<HTMLElement>("[data-slot^=swapping-text]");
        sourceParts.forEach((part, partIndex) => {
          const style = getComputedStyle(part);
          Object.assign(cloneParts[partIndex].style, { transform: style.transform, opacity: style.opacity, filter: style.filter, width: style.width });
        });
        target.replaceChildren(...clone.childNodes);
      });
    };
    const update = () => {
      syncLabels();
      const indicator = navigation.querySelector<HTMLElement>(".navigation-highlight__indicator");
      if (indicator) {
        const bounds = wrapper.getBoundingClientRect();
        const highlight = indicator.getBoundingClientRect();
        const clip = `inset(${Math.max(0, highlight.top - bounds.top)}px ${Math.max(0, bounds.right - highlight.right)}px ${Math.max(0, bounds.bottom - highlight.bottom)}px ${Math.max(0, highlight.left - bounds.left)}px)`;
        overlay.style.clipPath = clip;
        stableFrames = clip === previous ? stableFrames + 1 : 0;
        previous = clip;
      }
      if (navigation.querySelector('[data-slot="swapping-text-slot"]')) stableFrames = 0;
      if (stableFrames < 20) frame = requestAnimationFrame(update);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      stableFrames = 0;
      frame = requestAnimationFrame(update);
    };
    const onTextHandoff = (event: Event) => {
      if ((event.target as HTMLElement).contains(wrapper)) restart();
    };
    const onTextPrimed = (event: Event) => {
      if ((event.target as HTMLElement).contains(wrapper)) syncLabels();
    };
    document.addEventListener("highlight-text-handoff", onTextHandoff);
    document.addEventListener("highlight-text-handoff-primed", onTextPrimed);
    const observer = new ResizeObserver(restart);
    observer.observe(wrapper);
    restart();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("highlight-text-handoff", onTextHandoff); document.removeEventListener("highlight-text-handoff-primed", onTextPrimed); };
  }, [value, children, enabled]);

  return (
    <div className="navigation-highlight-wrapper" ref={wrapperRef}>
      <Highlight value={value} controlledItems mode="parent"
        transition={enabled ? motionTokens.spring.handoff : { duration: 0 }}
        containerClassName="navigation-highlight" className="navigation-highlight__indicator">
        {children}
      </Highlight>
      <div className="navigation-highlight-overlay" ref={overlayRef} aria-hidden="true" inert />
    </div>
  );
}
