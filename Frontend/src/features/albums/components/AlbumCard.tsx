import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { useLocale } from "../../../context/LocaleContext";
import { mediaUrl } from "../../../utils/media";
import type { Album } from "../types";

interface Props {
  album: Album;
  isOwner: boolean;
  showOwner?: boolean;
  /** Shown only to the owner. */
  onEdit?: (album: Album) => void;
}

export function AlbumCard({ album, isOwner, showOwner = false, onEdit }: Props) {
  const { t } = useLocale();
  const [failedId, setFailedId] = useState<string | null>(null);
  const preview = album.previewMediaId;
  const showImage = preview && failedId !== preview;
  const ownerLabel = isOwner ? t("You") : album.owner.username;

  return (
    <article className="album-card">
      <Link to={`/albums/${album.id}`} className="album-card__link" aria-label={t("Open album {name}", { name: album.name })}>
        <span className="album-card__media">
          {showImage ? (
            <img src={mediaUrl(preview)} alt="" loading="lazy" onError={() => setFailedId(preview)} />
          ) : (
            <span className="album-card__placeholder" aria-hidden="true"><Bookmark size={32} /></span>
          )}
          <span className="album-card__badge">{t(album.isPublic ? "Public" : "Private")}</span>
        </span>
        <span className="album-card__body">
          <span className="album-card__name">{album.name}</span>
          <span className="album-card__meta">
            {t("{count} media", { count: album.mediaCount })}
            {showOwner ? <> · <span className="album-card__owner">{t("by {owner}", { owner: ownerLabel })}</span></> : null}
          </span>
        </span>
      </Link>
      {isOwner && onEdit ? (
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
