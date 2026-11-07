import { useLayoutEffect, useRef, useState } from "react";
import { useCaptionPreview } from "../../features/albums/hooks/useCaptionPreview";
import { CustomDialog as Dialog } from "../../components/ui/CustomDialog";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { useLocale } from "../../context/LocaleContext";

export function AlbumCaption({ caption }: { caption: string }) {
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

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div className="album-hero__caption-area">
        <button type="button" className="album-hero__caption-button" aria-expanded={expanded} onClick={() => {
          if (window.matchMedia("(min-width: 768px)").matches) {
            if (!expanded) setShowFull(true);
            else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setShowFull(false);
            setExpanded((value) => !value);
          }
          else setOpen(true);
        }}>
          <span className="album-hero__caption-expand" style={{ height: expanded ? `${fullHeight}px` : "2.6em" }} onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && event.propertyName === "height" && !expanded) setShowFull(false);
          }}>
            <span ref={textRef} className="album-hero__caption">{showFull ? caption : preview}</span>
          </span>
          <span ref={fullRef} className="album-hero__caption-measure" aria-hidden="true">{caption}</span>
          {overflow ? <span className="album-hero__show-more" style={{ visibility: expanded || showFull ? "hidden" : "visible" }}>{t("Show more")}</span> : null}
        </button>
      </div>
      <Dialog.Portal>
        <BaseDialog.Backdrop className="album-caption-view__backdrop" />
        <Dialog.Viewport className="album-caption-view__viewport">
          <Dialog.Popup className="album-caption-view">
            <header className="album-caption-view__header">
              <Dialog.Title>{t("Album caption")}</Dialog.Title>
              <Dialog.Close className="btn btn--secondary">{t("Close")}</Dialog.Close>
            </header>
            <p className="album-caption-view__text">{caption}</p>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
