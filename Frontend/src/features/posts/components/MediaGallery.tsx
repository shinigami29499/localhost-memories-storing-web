import { AnimateIcon } from "@animate-ui/react/icons";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "@/components/animate-ui/icons/arrow-left";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { X } from "@/components/animate-ui/icons/x";
import type { MediaFile } from "../types";
import { mediaUrl } from "../../../utils/media";

interface Props {
  media: MediaFile[];
  onPreviousPost?: () => void;
  onNextPost?: () => void;
}

export function MediaGallery({ media, onPreviousPost, onNextPost }: Props) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [failedId, setFailedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeIndex = Math.min(index, Math.max(0, media.length - 1));
  const file = media[activeIndex];
  const previous = () => setIndex(Math.max(0, activeIndex - 1));
  const next = () => setIndex(Math.min(media.length - 1, activeIndex + 1));

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
    <div
      className="media-gallery"
      role="region"
      aria-label={media.length > 1 ? "Post photos and videos" : "Post media"}
      aria-roledescription="carousel"
      tabIndex={media.length > 1 ? 0 : undefined}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          if (event.key === "ArrowLeft") previous();
          else next();
        }
      }}
    >
      <figure className="media-gallery__item">
        <div className="media-gallery__stage" key={file.id}>
          {failedId === file.id ? (
            <p className="media-gallery__unsupported" role="alert">Could not load this media.</p>
          ) : file.mediaKind === "image" ? (
            <img
              src={mediaUrl(file.id)}
              alt={file.originalFilename}
              loading="eager"
              draggable={false}
              className="media-gallery__image"
              role="button"
              tabIndex={0}
              aria-label="Image: click edges to navigate or center to enlarge"
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setLightbox(true);
                }
              }}
              onClick={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                const position = (event.clientX - bounds.left) / bounds.width;
                if (position < 0.25) {
                  if (media.length > 1) previous();
                  else onPreviousPost?.();
                } else if (position > 0.75) {
                  if (media.length > 1) next();
                  else onNextPost?.();
                } else {
                  setLightbox(true);
                }
              }}
              onError={() => setFailedId(file.id)}
            />
          ) : file.mediaKind === "video" ? (
            <video
              src={mediaUrl(file.id)}
              controls
              preload="metadata"
              className="media-gallery__video"
              onError={() => setFailedId(file.id)}
            />
          ) : (
            <div className="media-gallery__unsupported">
              <p>Unsupported media type ({file.mimeType})</p>
              <a href={mediaUrl(file.id)} download={file.originalFilename}>Download</a>
            </div>
          )}
        </div>
      </figure>
      {lightbox ? (
        <dialog
          ref={dialogRef}
          className="media-lightbox"
          aria-label={file.originalFilename}
          onCancel={(event) => { event.preventDefault(); setLightbox(false); }}
          onClick={(event) => { if (event.target === event.currentTarget) setLightbox(false); }}
        >
          <AnimateIcon animateOnHover asChild>
            <button type="button" className="viewer-icon-btn media-lightbox__close" aria-label="Close image preview" title="Close image preview" onClick={() => setLightbox(false)}>
              <X size={20} aria-hidden="true" />
            </button>
          </AnimateIcon>
          <img src={mediaUrl(file.id)} alt={file.originalFilename} />
        </dialog>
      ) : null}
    </div>
  );
}
