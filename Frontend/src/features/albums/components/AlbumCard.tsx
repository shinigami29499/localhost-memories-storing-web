import { useRef, useState } from "react";
import { useInView } from "motion/react";
import { Link } from "react-router-dom";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { Check } from "@/components/animate-ui/icons/check";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import type { Album } from "../types";

interface Props {
  album: Album;
  isOwner: boolean;
  showOwner?: boolean;
  /** Shown only to the owner. */
  onEdit?: (album: Album) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: (albumId: string) => void;
}

export function AlbumCard({ album, isOwner, showOwner = false, onEdit, selectionMode = false, selected = false, onSelect }: Props) {
  const { t } = useLocale();
  const previewRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(previewRef, { margin: "200px 0px" });
  const [failedId, setFailedId] = useState<string | null>(null);
  const preview = album.previewMediaId;
  const showImage = preview && failedId !== preview;
  const ownerLabel = album.owner.username;
  const [ownerPrefix, ownerSuffix] = t("by {owner}", { owner: "{owner}" }).split("{owner}");

  return (
    <article className="album-card">
      <Link to={`/gallery/album/${album.id}`} className="album-card__link" data-media-id={album.id} role={selectionMode ? "checkbox" : undefined} aria-checked={selectionMode ? selected : undefined}
        aria-label={t(selectionMode ? "Select album {name}" : "Open album {name}", { name: album.name })} aria-description={t("Hold to select, or press Shift+Space.")}
        onDragStart={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => { if ((event.shiftKey || selectionMode) && event.key === " ") { event.preventDefault(); if (!event.repeat) onSelect?.(album.id); } }}
        onClick={(event) => { if (selectionMode) { event.preventDefault(); onSelect?.(album.id); } }}>
        <span ref={previewRef} className="album-card__media">
          {showImage ? (
            inView ? <img src={mediaPreviewUrl(preview)} alt="" loading="lazy" decoding="async" onError={() => setFailedId(preview)} /> : null
          ) : (
            <span className="album-card__placeholder" aria-hidden="true"><Bookmark size={32} /></span>
          )}
          <span className="album-card__badge">{t(album.isPublic ? "Public" : "Private")}</span>
          <span className="album-card__count" aria-label={t("{count} media", { count: album.mediaCount })}>
            {album.mediaCount}
          </span>
          {selectionMode && <span className={`album-card__selection${selected ? " album-card__selection--selected" : ""}`} aria-hidden="true">
            {selected && <Check size={16} aria-hidden="true" />}
          </span>}
        </span>
          <span className="album-card__body">
            <span className="album-card__details">
              <span className="album-card__name">{album.name}</span>
              {showOwner ? <span className="album-card__owner">{ownerPrefix}<strong>{ownerLabel}</strong>{ownerSuffix}</span> : null}
              <time dateTime={album.createdAt}>{new Date(album.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</time>
            </span>
          </span>
      </Link>
      {isOwner && onEdit && !selectionMode ? (
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <button
            type="button"
            className="album-card__edit"
            aria-label={t("Edit album {name}", { name: album.name })}
            title={t("Edit album")}
            onClick={() => onEdit(album)}
          >
            <PencilLine size={16} aria-hidden="true" />
          </button>
        </AnimateIcon>
      ) : null}
    </article>
  );
}
