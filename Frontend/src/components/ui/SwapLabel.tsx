import { SwappingText } from "@animate-ui/react/primitives/texts/swapping";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useAnimationStore } from "../../store/animationStore";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export function SwapLabel({ text, index }: { text: string; index: number }) {
  const enabled = useAnimationStore((state) => state.enabled);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [swap, setSwap] = useState({ display: text, generation: 0 });
  const frame = useRef(0);

  useEffect(() => { setSwap((current) => ({ ...current, display: text })); }, [text]);
  useEffect(() => {
    const onHandoff = (event: Event) => {
      const detail = (event as CustomEvent<{ labels: string[] }>).detail;
      const target = event.target as HTMLElement;
      const label = target.querySelector<HTMLElement>(`[data-swap-label-index="${index}"]`);
      if (!label || label.dataset.swapLabel !== text || !enabled || reduced) return;
      const previous = detail.labels[index] ?? "";
      if (previous === text) return;
      cancelAnimationFrame(frame.current);
      flushSync(() => setSwap((current) => ({ display: previous, generation: current.generation + 1 })));
      frame.current = requestAnimationFrame(() => setSwap((current) => ({ ...current, display: text })));
    };
    document.addEventListener("highlight-text-handoff", onHandoff);
    return () => { cancelAnimationFrame(frame.current); document.removeEventListener("highlight-text-handoff", onHandoff); };
  }, [enabled, index, reduced, text]);

  return <span data-swap-label={text} data-swap-label-index={index}>
    <span aria-hidden="true">{enabled && !reduced ? <SwappingText key={swap.generation} text={swap.display} stagger={0.025} /> : text}</span>
    <span className="sr-only">{text}</span>
  </span>;
}
