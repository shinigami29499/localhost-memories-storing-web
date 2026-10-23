import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { AdminPost } from "../../types";
import { mediaUrl } from "../../utils/media";

export function AdminMediaPreview({ post, onClose }: { post: AdminPost; onClose: () => void }) {
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

  return (
    <dialog
      ref={dialogRef}
      className="admin-preview"
      aria-label={`Media preview for post by ${post.author.username}`}
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
          <span aria-live="polite">Media {index + 1} of {post.media.length}</span>
          {post.deletedAt !== null ? <span>Preview from trash</span> : null}
          <button
            type="button"
            className="btn btn--secondary admin-icon-btn"
            aria-label="Close media preview"
            title="Close media preview"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="admin-preview__media" key={file.id}>
          {failedId === file.id ? (
            <p role="alert">Could not load this media. It may be missing or your session may have expired.</p>
          ) : file.mediaKind === "video" ? (
            <video
              src={mediaUrl(file.id, true)}
              controls
              preload="metadata"
              aria-label={`Video ${index + 1} of ${post.media.length}`}
              onError={() => setFailedId(file.id)}
            />
          ) : file.mediaKind === "image" ? (
            <img
              src={mediaUrl(file.id, true)}
              alt={`Image ${index + 1} of ${post.media.length} by ${post.author.username}`}
              onError={() => setFailedId(file.id)}
            />
          ) : (
            <p role="alert">Unsupported media type ({file.mimeType}).</p>
          )}
        </div>
        <div className="admin-preview__navigation">
          <button
            type="button"
            className="btn btn--secondary admin-icon-btn"
            aria-label="Previous media"
            title="Previous media"
            disabled={index === 0}
            onClick={() => changeMedia(index - 1)}
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn--secondary admin-icon-btn"
            aria-label="Next media"
            title="Next media"
            disabled={index === post.media.length - 1}
            onClick={() => changeMedia(index + 1)}
          >
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
