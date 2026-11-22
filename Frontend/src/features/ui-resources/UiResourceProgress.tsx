import { useEffect, useRef, useState, type ReactNode } from "react";
import { minimumUiOverlayMs } from "./uiOverlayPolicy";
import "./ui-resource-progress.css";

export function UiResourceProgress({ label, heading, loaded = 0, total = 1, stepped, complete, onCompleted }: {
  label: string;
  heading?: ReactNode;
  loaded?: number;
  total?: number;
  stepped?: boolean;
  complete?: boolean;
  onCompleted?: () => void;
}) {
  const [percent, setPercent] = useState(0);
  const target = Math.min(99, Math.floor(loaded * 100 / total));
  const targetRef = useRef(target);
  useEffect(() => { targetRef.current = target; }, [target]);
  useEffect(() => {
    if (!stepped) return;
    const stepMs = minimumUiOverlayMs / 100;
    const start = performance.now();
    const timer = window.setInterval(() => {
      const ceiling = complete ? 100 : Math.min(targetRef.current, Math.floor((performance.now() - start) / stepMs));
      setPercent((value) => value < ceiling ? value + 1 : value);
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [stepped, complete]);
  useEffect(() => {
    if (complete && percent === 100) onCompleted?.();
  }, [complete, percent, onCompleted]);

  return (
    <div className="ui-resource-progress">
      <span className="ui-resource-progress__title" aria-hidden="true">{heading ?? label}</span>
      <progress aria-label={label} value={stepped ? percent : loaded} max={stepped ? 100 : total} />
    </div>
  );
}
