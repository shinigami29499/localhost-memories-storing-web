import { useLayoutEffect, useRef, useState, type TransitionEvent } from "react";
import { useCaptionPreview } from "../../features/albums/hooks/useCaptionPreview";
import { useLocale } from "../../context/LocaleContext";

export function useAlbumCaption(caption: string) {
  const { t } = useLocale();
  const { textRef, preview, overflow } = useCaptionPreview<HTMLSpanElement>(caption);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const fullRef = useRef<HTMLSpanElement>(null);
  const [fullHeight, setFullHeight] = useState(0);

  useLayoutEffect(() => {
    const element = fullRef.current;
    if (!element) return;
    const measure = () => setFullHeight(element.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [caption]);

  const toggle = () => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      if (!expanded) setShowFull(true);
      else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setShowFull(false);
      setExpanded((value) => !value);
    } else setOpen(true);
  };
  const finishTransition = (event: TransitionEvent<HTMLSpanElement>) => {
    if (event.target === event.currentTarget && event.propertyName === "height" && !expanded) setShowFull(false);
  };
  return { t, textRef, preview, overflow, open, setOpen, expanded, showFull, fullRef, fullHeight, toggle, finishTransition };
}
