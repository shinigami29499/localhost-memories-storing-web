import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { UI_TIMING } from "@/config/uiTiming";
import { useLocale } from "@/context/LocaleContext";
import { UiResourceProgress } from "@/features/ui-resources/UiResourceProgress";
import { useUiRouteProgress } from "@/features/ui-resources/uiRoute";
import { useRouteOverlayFade } from "@/features/ui-resources/useRouteLoadingOverlay";
import "./mobile-page-loading.css";

export function MobilePageLoadingOverlay({ pathname, title, icon, complete, handoff, headerTitle, keepHeaderTitle, pageTransition }: {
  pathname?: string;
  title?: string;
  icon?: ReactNode;
  complete?: boolean;
  pageTransition?: boolean;
  handoff?: boolean;
  headerTitle?: RefObject<HTMLSpanElement | null>;
  keepHeaderTitle?: boolean;
}) {
  const { t } = useLocale();
  const progress = useUiRouteProgress(pathname ?? window.location.pathname);
  const overlayRef = useRouteOverlayFade(Boolean(pageTransition && complete));
  const titleRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!handoff) return;
    const duration = UI_TIMING.PAGE_HANDOFF_DURATION;
    const animations: Animation[] = [];
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

    return () => {
      animations.forEach((animation) => animation.cancel());
      if (clone) source?.style.removeProperty("visibility");
      clone?.remove();
    };
  }, [handoff, headerTitle]);

  return <div ref={overlayRef} className="mobile-page-loading" data-complete={complete || undefined} data-handoff={handoff || undefined} aria-hidden={complete || undefined}>
    <div className="mobile-page-loading__content">
      {icon && <span className="mobile-page-loading__icon" aria-hidden="true">{icon}</span>}
      <UiResourceProgress label={title ? `${t("Loading page...")} ${t(title)}` : t("Loading page...")}
        heading={keepHeaderTitle ? t("Loading page...") : title && <span ref={titleRef} className="mobile-page-title">{t(title)}</span>}
        loaded={progress?.loaded} total={progress?.total} stepped complete={complete} pageTransition={pageTransition} />
    </div>
  </div>;
}
