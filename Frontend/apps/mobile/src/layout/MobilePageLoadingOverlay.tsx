import { useCallback, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useLocale } from "@/context/LocaleContext";
import { UiResourceProgress } from "@/features/ui-resources/UiResourceProgress";
import { useUiRouteProgress } from "@/features/ui-resources/uiRoute";
import "./mobile-page-loading.css";

export function MobilePageLoadingOverlay({ pathname, title, icon, handoff, headerTitle, onHandoffComplete }: {
  pathname?: string;
  title?: string;
  icon?: ReactNode;
  handoff?: boolean;
  headerTitle?: RefObject<HTMLSpanElement | null>;
  onHandoffComplete?: () => void;
}) {
  const { t } = useLocale();
  const progress = useUiRouteProgress(pathname ?? window.location.pathname);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [barComplete, setBarComplete] = useState(false);
  const finishBar = useCallback(() => setBarComplete(true), []);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!handoff || !barComplete || !overlay) return;
    const duration = 320;
    const animations = [overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease-out", fill: "forwards" })];
    const source = titleRef.current;
    const target = headerTitle?.current;
    let clone: HTMLSpanElement | undefined;
    if (source && target) {
      const from = source.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      if (from.width && from.height && to.width && to.height) {
        clone = source.cloneNode(true) as HTMLSpanElement;
        clone.setAttribute("aria-hidden", "true");
        const style = getComputedStyle(source);
        Object.assign(clone.style, {
          position: "fixed", zIndex: "100001", left: `${from.left}px`, top: `${from.top}px`,
          pointerEvents: "none", whiteSpace: "nowrap", transformOrigin: "left center",
          fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight,
        });
        document.body.append(clone);
        source.style.visibility = "hidden";
        const x = to.left - from.left;
        const y = to.top + to.height / 2 - (from.top + from.height / 2);
        animations.push(clone.animate([
          { transform: "translate(0, 0) scale(1)" },
          { transform: `translate(${x}px, ${y}px) scale(${to.width / from.width})` },
        ], { duration, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "forwards" }));
        animations.push(target.animate([{ opacity: 0 }, { opacity: 0 }], { duration, fill: "forwards" }));
      }
    }

    let cancelled = false;
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (!cancelled) onHandoffComplete?.();
    });
    return () => {
      cancelled = true;
      animations.forEach((animation) => animation.cancel());
      if (source) source.style.removeProperty("visibility");
      clone?.remove();
    };
  }, [handoff, barComplete, headerTitle, onHandoffComplete]);

  return <div className="mobile-page-loading" ref={overlayRef} data-handoff={handoff || undefined} aria-hidden={(handoff && barComplete) || undefined}>
    <div className="mobile-page-loading__content">
      {icon && <span className="mobile-page-loading__icon" aria-hidden="true">{icon}</span>}
      <UiResourceProgress label={title ? `${t("Loading page...")} ${t(title)}` : t("Loading page...")}
        heading={title && <span ref={titleRef} className="mobile-page-title">{t(title)}</span>}
        loaded={progress?.loaded} total={progress?.total} stepped complete={handoff} onCompleted={finishBar} />
    </div>
  </div>;
}
