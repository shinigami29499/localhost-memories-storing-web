import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Heart } from "@/components/animate-ui/icons/heart";
import { useLocale } from "../../../context/LocaleContext";
import { mediaUrl } from "../../../utils/media";
import type { MediaFile } from "../types";

interface Props {
  media: MediaFile;
  favoriteBusy?: boolean;
  favoriteDisabled?: boolean;
  onToggleFavorite?: (mediaId: string, isFavorited: boolean) => void;
}

export function MediaCard({
  media,
  favoriteBusy = false,
  favoriteDisabled = false,
  onToggleFavorite,
}: Props) {
  const { t } = useLocale();

  return (
    <article className="media-card">
      {media.mediaKind === "video" ? (
        <video
          className="media-card__preview"
          src={mediaUrl(media.id)}
          controls
          preload="metadata"
          aria-label={media.originalFilename}
        />
      ) : (
        <img
          className="media-card__preview"
          src={mediaUrl(media.id)}
          alt={media.originalFilename}
          loading="lazy"
        />
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
