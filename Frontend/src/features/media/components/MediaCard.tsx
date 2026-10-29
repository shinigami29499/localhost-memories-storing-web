import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Eye } from "@/components/animate-ui/icons/eye";
import { Heart } from "@/components/animate-ui/icons/heart";
import { useLocale } from "../../../context/LocaleContext";
import { mediaPreviewUrl } from "../../../utils/media";
import type { MediaFile } from "../types";

interface Props {
  media: MediaFile;
  favoriteBusy?: boolean;
  favoriteDisabled?: boolean;
  onToggleFavorite?: (mediaId: string, isFavorited: boolean) => void;
  onOpen?: (mediaId: string) => void;
}

export function MediaCard({
  media,
  favoriteBusy = false,
  favoriteDisabled = false,
  onToggleFavorite,
  onOpen,
}: Props) {
  const { t } = useLocale();

  return (
    <article className="media-card">
      {media.mediaKind === "video" ? (
        <div className="media-card__video">
          <img
            className="media-card__preview"
            src={mediaPreviewUrl(media.id)}
            alt={media.originalFilename}
            loading="lazy"
            decoding="async"
          />
          {onOpen ? (
            <button
              type="button"
              className="viewer-icon-btn media-card__open-video"
              aria-label={t("Open media preview")}
              title={t("Open media preview")}
              onClick={() => onOpen(media.id)}
            >
              <Eye size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : (
        onOpen ? (
          <button
            type="button"
            className="media-card__open"
            aria-label={t("Open media preview")}
            title={t("Open media preview")}
            onClick={() => onOpen(media.id)}
          >
            <img className="media-card__preview" src={mediaPreviewUrl(media.id)} alt={media.originalFilename} loading="lazy" decoding="async" />
          </button>
        ) : (
          <img
            className="media-card__preview"
            src={mediaPreviewUrl(media.id)}
            alt={media.originalFilename}
            loading="lazy"
            decoding="async"
          />
        )
      )}
      <footer className="media-card__footer">
        <span className="media-card__name" title={media.originalFilename}>{media.originalFilename}</span>
        {onToggleFavorite ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className={`media-card__favorite${media.isFavorited ? " media-card__favorite--active" : ""}`}
              aria-label={t(media.isFavorited ? "Remove from favorites" : "Add to favorites")}
              title={t(media.isFavorited ? "Remove from favorites" : "Add to favorites")}
              aria-busy={favoriteBusy || undefined}
              disabled={favoriteDisabled || favoriteBusy}
              onClick={() => onToggleFavorite(media.id, media.isFavorited)}
            >
              <Heart size={18} fill={media.isFavorited ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          </AnimateIcon>
        ) : null}
      </footer>
    </article>
  );
}
