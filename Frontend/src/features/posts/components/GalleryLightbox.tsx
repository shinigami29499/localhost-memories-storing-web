import { AnimateIcon } from "@animate-ui/react/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText } from "@/components/animate-ui/icons/file-text";
import { X } from "@/components/animate-ui/icons/x";
import { useLocale } from "../../../context/LocaleContext";
import type { Post } from "../types";
import { MediaCarousel } from "./MediaCarousel";

const interactive = "img, video, button, a, .media-carousel__controls";

interface GalleryLightboxProps {
  posts: Post[];
  initialPostId: string;
  onClose: () => void;
}

/** Full-screen carousel over every media file of the given posts, starting at the selected post. */
export function GalleryLightbox({ posts, initialPostId, onClose }: GalleryLightboxProps) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointer = useRef<{ x: number; y: number } | null>(null);
  const entries = useMemo(() => posts.flatMap((post) => post.media.map((file) => ({ post, file }))), [posts]);
  const [initialIndex] = useState(() => Math.max(0, entries.findIndex((entry) => entry.post.id === initialPostId)));
  const [selected, setSelected] = useState(initialIndex);
  const media = useMemo(() => entries.map((entry) => entry.file), [entries]);
  const current = entries[selected] ?? entries[initialIndex];

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  if (!current) return null;

  return (
    <dialog
      ref={dialogRef}
      className="media-lightbox gallery-lightbox"
      aria-label={t("Media viewer")}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onPointerDown={(event) => {
        backdropPointer.current = event.target instanceof Element && !event.target.closest(interactive)
          ? { x: event.clientX, y: event.clientY }
          : null;
      }}
      onClick={(event) => {
        const start = backdropPointer.current;
        backdropPointer.current = null;
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6
          && event.target instanceof Element && !event.target.closest(interactive)) {
          onClose();
        }
      }}
    >
      <div className="gallery-lightbox__actions">
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <Link
            to={`/posts/${current.post.id}`}
            className="viewer-icon-btn"
            aria-label={t("Open post")}
            title={t("Open post")}
          >
            <FileText size={20} aria-hidden="true" />
          </Link>
        </AnimateIcon>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <button type="button" className="viewer-icon-btn" aria-label={t("Close image preview")} title={t("Close image preview")} onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </AnimateIcon>
      </div>
      <MediaCarousel media={media} initialIndex={initialIndex} onSelectedChange={setSelected} />
    </dialog>
  );
}
