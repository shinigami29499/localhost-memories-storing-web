import { useEffect, useRef, useState } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { ArrowLeft } from "@/components/animate-ui/icons/arrow-left";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { X } from "@/components/animate-ui/icons/x";
import type { AdminPost } from "../types";
import { mediaUrl } from "../../../utils/media";
import { useSwipe } from "../../../hooks/useSwipe";
import { useLocale } from "../../../context/LocaleContext";
import "./MediaPreview.css";

interface MediaPreviewProps {
  post: Pick<AdminPost, "author" | "media" | "deletedAt">;
  includeDeleted?: boolean;
  onClose: () => void;
}

export function MediaPreview({ post, includeDeleted = false, onClose }: MediaPreviewProps) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [failedId, setFailedId] = useState<string | null>(null);
  const file = post.media[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  const changeMedia = (next: number) => {
    setFailedId(null);
    setIndex(next);
  };
  const swipe = useSwipe({
    onSwipeLeft: () => { if (index < post.media.length - 1) changeMedia(index + 1); },
    onSwipeRight: () => { if (index > 0) changeMedia(index - 1); },
  });

  return (
    <dialog
      ref={dialogRef}
      className="admin-preview"
      aria-label={t("Media preview for post by {username}", { username: post.author.username })}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          return;
        }
        if (event.target instanceof HTMLVideoElement) return;
        if (event.key === "ArrowLeft" && index > 0) changeMedia(index - 1);
        if (event.key === "ArrowRight" && index < post.media.length - 1) changeMedia(index + 1);
      }}
    >
      <div className="admin-preview__content">
        <div className="admin-preview__toolbar">
          <span aria-live="polite">{t("Media {current} of {total}", { current: index + 1, total: post.media.length })}</span>
          {post.deletedAt !== null ? <span>{t("Preview from trash")}</span> : null}
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="btn btn--secondary admin-icon-btn"
              aria-label={t("Close media preview")}
              title={t("Close media preview")}
              onClick={onClose}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </AnimateIcon>
        </div>
        <div className="admin-preview__media" key={file.id} {...swipe}>
          {failedId === file.id ? (
            <p role="alert">{t("Could not load this media. It may be missing or your session may have expired.")}</p>
          ) : file.mediaKind === "video" ? (
            <video
              src={mediaUrl(file.id, includeDeleted)}
              controls
              preload="metadata"
              aria-label={t("Video {current} of {total}", { current: index + 1, total: post.media.length })}
              onError={() => setFailedId(file.id)}
            />
          ) : file.mediaKind === "image" ? (
            <img
              src={mediaUrl(file.id, includeDeleted)}
              alt={t("Image {current} of {total} by {username}", { current: index + 1, total: post.media.length, username: post.author.username })}
              onError={() => setFailedId(file.id)}
            />
          ) : (
            <p role="alert">{t("Unsupported media type ({mimeType}).", { mimeType: file.mimeType })}</p>
          )}
        </div>
        <div className="admin-preview__navigation">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="btn btn--secondary admin-icon-btn"
              aria-label={t("Previous media")}
              title={t("Previous media")}
              disabled={index === 0}
              onClick={() => changeMedia(index - 1)}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="btn btn--secondary admin-icon-btn"
              aria-label={t("Next media")}
              title={t("Next media")}
              disabled={index === post.media.length - 1}
              onClick={() => changeMedia(index + 1)}
            >
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </AnimateIcon>
        </div>
      </div>
    </dialog>
  );
}
