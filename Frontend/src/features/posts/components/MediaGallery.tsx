import { AnimateIcon } from "@animate-ui/react/icons";
import { useEffect, useRef, useState } from "react";
import { X } from "@/components/animate-ui/icons/x";
import type { MediaFile } from "../types";
import { mediaUrl } from "../../../utils/media";
import { useLocale } from "../../../context/LocaleContext";
import { useSwipe } from "../../../hooks/useSwipe";
import { MediaCarousel } from "./MediaCarousel";

interface Props {
  media: MediaFile[];
  onPreviousPost?: () => void;
  onNextPost?: () => void;
}

export function MediaGallery({ media, onPreviousPost, onNextPost }: Props) {
  const { t } = useLocale();
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [failedId, setFailedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointer = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const activeIndex = Math.min(index, Math.max(0, media.length - 1));
  const file = media[activeIndex];
  const swipe = useSwipe({
    onSwipeLeft: () => {
      swiped.current = true;
      if (media.length > 1) setIndex((activeIndex + 1) % media.length);
      else onNextPost?.();
    },
    onSwipeRight: () => {
      swiped.current = true;
      if (media.length > 1) setIndex((activeIndex - 1 + media.length) % media.length);
      else onPreviousPost?.();
    },
  });

  useEffect(() => {
    if (!lightbox) return;
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [lightbox]);

  if (!file) return null;

  return (
    <div className="media-gallery media-gallery--inline">
      <div
        className="media-gallery__stage"
        {...swipe}
        onTouchStart={(event) => {
          swiped.current = false;
          swipe.onTouchStart(event);
        }}
      >
        <figure className="media-gallery__slide media-gallery__slide--current">
          {failedId === file.id ? (
            <p className="media-gallery__unsupported" role="alert">{t("Could not load this media.")}</p>
          ) : file.mediaKind === "image" ? (
            <img
              src={mediaUrl(file.id)}
              alt={file.originalFilename}
              draggable={false}
              className="media-gallery__image"
              role="button"
              tabIndex={0}
              aria-label={t("Open image preview")}
              onClick={() => {
                if (!swiped.current) setLightbox(true);
                swiped.current = false;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setLightbox(true);
                }
              }}
              onError={() => setFailedId(file.id)}
            />
          ) : file.mediaKind === "video" ? (
            <video key={file.id} src={mediaUrl(file.id)} controls preload="metadata" className="media-gallery__video" onError={() => setFailedId(file.id)} />
          ) : (
            <div className="media-gallery__unsupported">
              <p>{t("Unsupported media type ({mimeType})", { mimeType: file.mimeType })}</p>
              <a href={mediaUrl(file.id)} download={file.originalFilename}>{t("Download")}</a>
            </div>
          )}
        </figure>
      </div>
      {lightbox ? (
        <dialog
          ref={dialogRef}
          className="media-lightbox"
          aria-label={file.originalFilename}
          onCancel={(event) => { event.preventDefault(); setLightbox(false); }}
          onPointerDown={(event) => {
            backdropPointer.current = event.target instanceof Element
              && !event.target.closest("img, video, button, a, .media-carousel__controls")
              ? { x: event.clientX, y: event.clientY }
              : null;
          }}
          onClick={(event) => {
            const start = backdropPointer.current;
            backdropPointer.current = null;
            if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6
              && event.target instanceof Element
              && !event.target.closest("img, video, button, a, .media-carousel__controls")) {
              setLightbox(false);
            }
          }}
        >
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button type="button" className="viewer-icon-btn media-lightbox__close" aria-label={t("Close image preview")} title={t("Close image preview")} onClick={() => setLightbox(false)}>
              <X size={20} aria-hidden="true" />
            </button>
          </AnimateIcon>
          <MediaCarousel media={media} initialIndex={activeIndex} />
        </dialog>
      ) : null}
    </div>
  );
}
