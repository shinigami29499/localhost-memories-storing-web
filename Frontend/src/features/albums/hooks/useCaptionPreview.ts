import { useEffect, useRef, useState } from "react";

export function useCaptionPreview<T extends HTMLElement>(caption: string) {
  const textRef = useRef<T>(null);
  const [overflow, setOverflow] = useState(false);
  const [preview, setPreview] = useState(caption);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    const measure = () => {
      const probe = element.cloneNode(false) as HTMLSpanElement;
      Object.assign(probe.style, { position: "absolute", visibility: "hidden", display: "block", width: `${element.clientWidth}px`, height: "auto", overflow: "visible", webkitLineClamp: "unset" });
      element.parentElement?.appendChild(probe);
      const lineHeight = parseFloat(getComputedStyle(probe).lineHeight);
      const fits = (text: string) => { probe.textContent = text; return probe.scrollHeight <= lineHeight * 2 + 1; };
      if (fits(caption)) {
        setPreview(caption);
        setOverflow(false);
      } else {
        let low = 0;
        let high = caption.length;
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          if (fits(`${caption.slice(0, middle).trimEnd()}...`)) low = middle;
          else high = middle - 1;
        }
        setPreview(`${caption.slice(0, low).trimEnd()}...`);
        setOverflow(true);
      }
      probe.remove();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element.parentElement ?? element);
    return () => observer.disconnect();
  }, [caption]);

  return { textRef, preview, overflow };
}
