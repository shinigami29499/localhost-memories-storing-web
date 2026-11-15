import { useLocale } from "@/context/LocaleContext";
import { StarRating } from "@/features/place/components/StarRating";
import type { PlaceMarkerPreviewProps } from "@/features/place/components/PlaceMap";
import { mediaPreviewUrl } from "@/utils/media";

export function MobilePlaceMarkerPreview({ place, mediaIds }: PlaceMarkerPreviewProps) {
  const { t } = useLocale();
  return <>
    <div className="place__popup-cover">
      {mediaIds.length ? <>
        <img src={mediaPreviewUrl(mediaIds[0], false, 320)} alt="" />
        {mediaIds.length > 1 && <span className="place__popup-count">+{mediaIds.length - 1}</span>}
      </> : <span className="place__popup-placeholder" aria-hidden="true">{place.markerIcon}</span>}
    </div>
    <strong>{place.name}</strong>
    {place.address && <small>{place.address}</small>}
    <small className="place__popup-author">{t("By {username}", { username: place.owner.username })}</small>
    <StarRating value={place.rating} size="sm" />
  </>;
}
