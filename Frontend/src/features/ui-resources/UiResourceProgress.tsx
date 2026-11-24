import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { UI_TIMING } from "../../config/uiTiming";
import "./ui-resource-progress.css";

export function UiResourceProgress({ label, heading, loaded = 0, total = 1, stepped, complete, pageTransition }: {
  label: string;
  heading?: ReactNode;
  loaded?: number;
  total?: number;
  stepped?: boolean;
  complete?: boolean;
  pageTransition?: boolean;
}) {
  const [percent, setPercent] = useState(0);
  const target = Math.min(99, Math.floor(loaded * 100 / total));
  const targetRef = useRef(target);
  useEffect(() => { targetRef.current = target; }, [target]);
  useEffect(() => {
    if (!stepped || complete || pageTransition) return;
    const stepMs = UI_TIMING.LOADING_MIN_VISIBLE / 100;
    const start = performance.now();
    const timer = window.setInterval(() => {
      const ceiling = Math.min(targetRef.current, Math.floor((performance.now() - start) / stepMs));
      setPercent((value) => value < ceiling ? value + 1 : value);
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [stepped, complete, pageTransition]);

  return (
    <div className="ui-resource-progress">
      <span className="ui-resource-progress__title" aria-hidden="true">{heading ?? label}</span>
      {pageTransition ? (
        <div className="ui-resource-progress__meter" style={{
          "--page-progress-duration": `${UI_TIMING.PAGE_TRANSITION_DURATION}ms`,
          "--page-progress-value": complete ? 1 : target / 100,
        } as CSSProperties}>
          <progress className="sr-only" aria-label={label} value={complete ? 100 : target} max={100} />
          <span className="ui-resource-progress__fill" data-complete={complete || undefined} aria-hidden="true" />
        </div>
      ) : <progress aria-label={label} value={stepped ? (complete ? 100 : percent) : loaded} max={stepped ? 100 : total} />}
    </div>
  );
}
