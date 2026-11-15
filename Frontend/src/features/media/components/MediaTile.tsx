import { Check } from "@/components/animate-ui/icons/check";
import { Clapperboard } from "@/components/animate-ui/icons/clapperboard";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Image as ImageIcon } from "@/components/animate-ui/icons/image";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Play } from "@/components/animate-ui/icons/play";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { memo } from "react";
import { GalleryTileContent } from "../../../components/ui/GalleryTileContent";

import { useMediaTile,type MediaTileProps } from "./useMediaTile";

export const MediaTile = memo(function MediaTile(props: MediaTileProps) {
  const { media, selectionMode, selectionEnabled = true, selectionDragEnabled = false, selected, favoriteDisabled, includeDeleted = false, preload = false, onSelect, onOpen, onFavorite, onUnavailable } = props;
  const { t, authorPrefix, authorSuffix, tileRef, inView, requestedId, city, time, retryGroup, failed, retrying, checkingAvailability, attempt, previewUrl, finishPreview, isSelecting, currentMediaId, failedActionLabel, interactions } = useMediaTile(props);
  const title = city
    ? t("{city} at {time}", { city: "{city}", time }).split("{city}").map((part, index) => index === 0 ? <span key={index} className="gallery-tile__time">{part}</span> : <span key={index}><strong>{city}</strong><span className="gallery-tile__time">{part}</span></span>)
    : <span className="gallery-tile__time">{time}</span>;
  return (
    <AnimateIcon asChild animateOnHover animateOnTap completeOnStop>
      <button
        ref={tileRef}
        type="button"
        className={`gallery-tile media-tile${isSelecting && selected ? " media-tile--selected" : ""}`}
        data-media-id={media.id}
        aria-label={t(isSelecting ? "Select {filename}" : failed || retrying
          ? failedActionLabel : "Open {filename}", { filename: media.originalFilename })}
        aria-disabled={!isSelecting && (checkingAvailability || (failed || retrying) && (retryGroup?.busy || retrying)) || undefined}
        title={(failed || retrying) && !isSelecting
          ? t(failedActionLabel, { filename: media.originalFilename }) : undefined}
        aria-busy={retrying || checkingAvailability || undefined}
        aria-pressed={isSelecting ? selected : undefined}
        aria-description={[t(selectionEnabled
          ? includeDeleted ? "Hold to select, or press Shift+Space." : "Hold to select, or press Shift+Space. Press F to add to favorites."
          : includeDeleted ? "Open media preview." : "Press F to add to favorites."), city].filter(Boolean).join(" ")}
        {...interactions}
      >
      {isSelecting ? (
        <span className="media-tile__selection" aria-hidden="true">
          <span className="media-tile__selection-indicator">
            {selected ? (
              <Check size={14} animate={false} aria-hidden="true" />
            ) : null}
          </span>
        </span>
      ) : null}
      <GalleryTileContent preview={<><span className="media-tile__motion">
        {failed || (requestedId !== media.id && !(retrying && currentMediaId.current === media.id)) || (!inView && !retrying && !preload) ? null : (
          <img key={`${media.id}:${attempt}`} className="media-tile__preview" src={previewUrl} onLoad={() => finishPreview(false)} onError={() => finishPreview(true)} alt="" loading={retrying || preload ? "eager" : "lazy"} decoding="async" draggable={false} />
        )}
      </span><span className="gallery-tile__badge media-tile__type" role="img" aria-label={t(media.mediaKind === "video" ? "Video" : "Image")}>
        {media.mediaKind === "video" ? <Clapperboard size={16} /> : <ImageIcon size={16} />}
      </span></>} overlay={media.mediaKind === "video" && !failed && !retrying ? (
        <>
          <span className="media-tile__play" aria-hidden="true"><Play size={24} /></span>
        </>
      ) : null} title={title} author={<>{authorPrefix}<strong>{media.ownerUsername || t("Unknown")}</strong>{authorSuffix}</>} />
      {failed || retrying ? (
        <span className="media-tile__retry" aria-hidden="true">
          {retrying || checkingAvailability
            ? <LoaderCircle size={24} className="spinner__wheel" />
            : <RotateCcw size={24} />}
        </span>
      ) : null}
      </button>
    </AnimateIcon>
  );
});
