import { CustomDialog as Dialog } from "@/components/ui/CustomDialog";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { useAlbumCaption } from "@/pages/albums/useAlbumCaption";

export function MobileAlbumCaption({ caption }: { caption: string }) {
  const { t, textRef, preview, overflow, open, setOpen, expanded, showFull, fullRef, fullHeight, toggle, finishTransition } = useAlbumCaption(caption);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div className="album-hero__caption-area">
        <button type="button" className="album-hero__caption-button" aria-expanded={expanded} onClick={toggle}>
          <span className="album-hero__caption-expand" style={{ height: expanded ? `${fullHeight}px` : "2.6em" }} onTransitionEnd={finishTransition}>
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
