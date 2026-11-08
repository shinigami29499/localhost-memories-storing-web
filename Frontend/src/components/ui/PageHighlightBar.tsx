import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "../animate-ui/icons/chevron-down";
import { useLocale } from "../../context/LocaleContext";
import { useAnimationStore } from "../../store/animationStore";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { usePageHighlightStore } from "../../store/pageHighlightStore";
import "./PageHighlightBar.css";

export function PageHighlightBar({ children, id, label, onToggle }: { children: ReactNode; id: string; label: string; onToggle?: () => void }) {
  const { t } = useLocale();
  const expanded = usePageHighlightStore((state) => state.expanded);
  const toggle = usePageHighlightStore((state) => state.toggle);
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const movingRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const moving = movingRef.current;
    if (!moving) return;
    const observer = new ResizeObserver(() => setHeight(moving.getBoundingClientRect().height));
    observer.observe(moving);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="page-highlight" data-expanded={expanded} data-animation-enabled={animationsEnabled}>
      <div className="page-highlight__navigation" style={isMobile && (!expanded || height) ? { height: expanded ? height : 20 } : undefined}>
        <div className="page-highlight__clip">
          <div className="page-highlight__moving" ref={movingRef}>
            <div id={id} inert={isMobile && !expanded}>{children}</div>
            <button className="page-highlight__toggle" type="button" aria-controls={id} aria-expanded={expanded}
              aria-label={`${t(expanded ? "Hide" : "Show")} ${t(label)}`} onClick={() => { onToggle?.(); toggle(); }}>
              <ChevronDown size={16} animate={false} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
