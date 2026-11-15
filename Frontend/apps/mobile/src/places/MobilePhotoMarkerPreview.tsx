import { useLocale } from "@/context/LocaleContext";
import type { PhotoMarkerPreviewProps } from "@/features/locations/components/LocationMap";
import { mediaPreviewUrl } from "@/utils/media";

export function MobilePhotoMarkerPreview({ item }: PhotoMarkerPreviewProps) {
  const { t } = useLocale();
  return <>
    <img src={mediaPreviewUrl(item.id, false, 320)} alt={item.originalFilename} />
    <div><small>{t("By {username}", { username: item.ownerUsername ?? t("Unknown") })}</small></div>
  </>;
}
