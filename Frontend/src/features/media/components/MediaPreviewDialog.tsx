import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import useEmblaCarousel, {
  CarouselCounter,
  CarouselDots,
} from "@animate-ui/react/primitives/carousel";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Heart } from "@/components/animate-ui/icons/heart";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { MapPin } from "@/components/animate-ui/icons/map-pin";
import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { useNavigate } from "react-router-dom";
import { ErrorState, Spinner } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useAlbums } from "../../albums/hooks/useAlbums";
import { mediaPreviewUrl, mediaUrl } from "../../../utils/media";
import type { MediaFile } from "../types";

const SaveToAlbumDialog = lazy(() =>
  import("../../albums/components/SaveToAlbumDialog").then((module) => ({ default: module.SaveToAlbumDialog })),
);

const MAX_DOTS = 10;

interface CommonProps {
  media: MediaFile[];
  initialMediaId: string;
  total?: number;
  loadingMore?: boolean;
  loadMoreError?: boolean;
  onLoadMore?: () => void;
  favoriteBusy?: boolean;
  onClose: (mediaId: string) => void;
}

type Props = CommonProps & ({
  trashActions: { onRestore: (mediaId: string) => void; onDelete: (mediaId: string) => void };
  onToggleFavorite?: never;
} | {
  trashActions?: never;
  onToggleFavorite: (mediaId: string, isFavorited: boolean) => void;
});

interface SlideProps {
  media: MediaFile;
  active: boolean;
  includeDeleted: boolean;
  onFavorite: () => void;
}

function PreviewSlide({ media, active, includeDeleted, onFavorite }: SlideProps) {
  const { t } = useLocale();
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { margin: "200px 0px" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const url = active ? mediaUrl(media.id, includeDeleted) : mediaPreviewUrl(media.id, includeDeleted);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!active) videoRef.current?.pause();
  }, [active]);

  return (
    <div ref={stageRef} className="media-preview-dialog__stage" data-active={active}>
      {!active && !inView ? null : failedUrl === url ? (
        <p role={active ? "alert" : undefined}>{t("Could not load this media.")}</p>
      ) : media.mediaKind === "video" && active ? (
        <video
          ref={videoRef}
          key={url}
          src={url}
          controls={active}
          preload={active ? "metadata" : "none"}
          tabIndex={active ? 0 : -1}
          aria-label={media.originalFilename}
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <img
          key={url}
          src={url}
          alt={media.originalFilename}
          loading={active ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onDoubleClick={active && !includeDeleted ? onFavorite : undefined}
          onError={() => setFailedUrl(url)}
        />
      )}
    </div>
  );
}

export function MediaPreviewDialog({
  media, initialMediaId, total = media.length, loadingMore = false, loadMoreError = false,
  onLoadMore, favoriteBusy = false, onToggleFavorite, onClose, trashActions,
}: Props) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const albumButtonRef = useRef<HTMLButtonElement>(null);
  const lastViewedId = useRef(initialMediaId);
  const [initialIndex] = useState(() => {
    const index = media.findIndex((item) => item.id === initialMediaId);
    return index >= 0 ? index : 0;
  });
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const selectedSnap = useRef(initialIndex);
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const hasMore = Boolean(onLoadMore) && media.length < total;
  const slideCount = media.length + (hasMore ? 1 : 0);
  const [carouselRef, api] = useEmblaCarousel({
    startIndex: initialIndex,
    loop: !hasMore && media.length >= (isMobile ? 3 : 5),
    align: "center",
    containScroll: false,
    scale: 0.8,
    visible: isMobile || slideCount === 1 ? 1 : 3,
    watchDrag: (_api, event) => !(event.target instanceof Element && event.target.closest("video")),
  });
  const current = media[Math.min(selectedIndex, slideCount - 1)];
  const albums = useAlbums("mine", Boolean(current) && !trashActions, current?.id);
  const inAlbum = albums.data?.some((album) => album.containsMedia) ?? false;

  useEffect(() => {
    if (current) lastViewedId.current = current.id;
  }, [current]);

  useEffect(() => {
    if (hasMore && selectedIndex >= media.length && !loadingMore && !loadMoreError) {
      onLoadMore?.();
    }
  }, [hasMore, selectedIndex, media.length, loadingMore, loadMoreError, onLoadMore]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    closeRef.current?.focus();
    return () => dialog.close();
  }, []);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      selectedSnap.current = api.selectedScrollSnap();
      setSelectedIndex(selectedSnap.current);
    };
    const restoreSelection = () => {
      // Option changes reapply startIndex, including when the final page enables looping.
      api.scrollTo(Math.min(selectedSnap.current, Math.max(0, api.scrollSnapList().length - 1)), true);
      update();
    };
    update();
    api.on("select", update).on("reInit", restoreSelection);
    return () => {
      api.off("select", update).off("reInit", restoreSelection);
    };
  }, [api]);

  if (media.length === 0) return null;

  const close = () => onClose(lastViewedId.current);
  const addFavorite = () => {
    if (current && !favoriteBusy && !current.isFavorited) onToggleFavorite?.(current.id, false);
  };

  return (
    <dialog
      ref={dialogRef}
      className="media-lightbox media-preview-dialog"
      aria-label={t("Media viewer")}
      onCancel={(event) => {
        event.preventDefault();
        if (!albumDialogOpen) close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onKeyDown={(event) => {
        if (albumDialogOpen) return;
        if (event.target instanceof Element && event.target.closest("video, input, textarea")) return;
        if (event.key === "ArrowLeft" && slideCount > 1) {
          event.preventDefault();
          api?.scrollPrev();
        } else if (event.key === "ArrowRight" && slideCount > 1) {
          event.preventDefault();
          api?.scrollNext();
        }
      }}
    >
      <button
        ref={closeRef}
        type="button"
        className="viewer-icon-btn media-lightbox__close"
        aria-label={t("Close image preview")}
        title={t("Close image preview")}
        onClick={close}
      >
        <X size={20} aria-hidden="true" />
      </button>
      {current ? <div className="media-preview-dialog__actions">
        {trashActions ? <>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="viewer-icon-btn media-preview-dialog__action"
              aria-label={t("Restore")}
              title={t("Restore")}
              onClick={() => trashActions.onRestore(current.id)}
            >
              <RotateCcw size={20} aria-hidden="true" />
            </button>
          </AnimateIcon>
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="viewer-icon-btn media-preview-dialog__action"
              aria-label={t("Permanently delete")}
              title={t("Permanently delete")}
              onClick={() => trashActions.onDelete(current.id)}
            >
              <Trash2 size={20} aria-hidden="true" />
            </button>
          </AnimateIcon>
        </> : <>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <button
            type="button"
            className="viewer-icon-btn media-preview-dialog__action"
            aria-label={t(current.isFavorited ? "Remove from favorites" : "Add to favorites")}
            title={t(current.isFavorited ? "Remove from favorites" : "Add to favorites")}
            aria-pressed={current.isFavorited}
            aria-busy={favoriteBusy || undefined}
            disabled={favoriteBusy}
            onClick={() => onToggleFavorite?.(current.id, current.isFavorited)}
          >
            {favoriteBusy ? (
              <LoaderCircle size={20} className="spinner__wheel" aria-hidden="true" />
            ) : (
              <Heart
                size={20}
                stroke={current.isFavorited ? "var(--danger)" : "currentColor"}
                fill={current.isFavorited ? "var(--danger)" : "none"}
                aria-hidden="true"
              />
            )}
          </button>
        </AnimateIcon>
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <button
            ref={albumButtonRef}
            type="button"
            className="viewer-icon-btn media-preview-dialog__action"
            aria-label={t("Save to album")}
            title={t("Save to album")}
            aria-pressed={inAlbum}
            aria-busy={albums.isPending || undefined}
            onClick={() => setAlbumDialogOpen(true)}
          >
            <Bookmark
              size={20}
              stroke={inAlbum ? "var(--notification-icon)" : "currentColor"}
              fill={inAlbum ? "var(--notification-icon)" : "none"}
              aria-hidden="true"
            />
          </button>
        </AnimateIcon>
        </>}
        {!trashActions && current.mediaKind === "image" && current.location ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="viewer-icon-btn media-preview-dialog__action"
              aria-label={t("View photo location")}
              title={t("View photo location")}
              onClick={() => {
                onClose(current.id);
                navigate(`/locations?mediaId=${encodeURIComponent(current.id)}`);
              }}
            >
              <MapPin size={20} aria-hidden="true" />
            </button>
          </AnimateIcon>
        ) : null}
      </div> : null}
      <div
        className="media-preview-dialog__content"
        data-slot="carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label={t("Media viewer")}
      >
        <div ref={carouselRef} className="media-preview-dialog__viewport" data-slot="carousel-content">
          <div className="media-preview-dialog__track">
            {media.map((item, index) => (
              <div
                key={item.id}
                className="media-preview-dialog__item"
                data-slot="carousel-item"
                role="group"
                aria-roledescription="slide"
                aria-label={t("Media {current} of {total}", { current: index + 1, total })}
              >
                <PreviewSlide media={item} active={item.id === current?.id} includeDeleted={Boolean(trashActions)} onFavorite={addFavorite} />
              </div>
            ))}
            {hasMore ? (
              <div
                className="media-preview-dialog__item"
                data-slot="carousel-item"
                role="group"
                aria-roledescription="slide"
                aria-label={t("Media {current} of {total}", { current: media.length + 1, total })}
              >
                <div className="media-preview-dialog__stage" aria-busy={loadingMore}>
                  {loadMoreError ? (
                    <ErrorState message={t("Could not load more media.")} onRetry={onLoadMore} />
                  ) : <Spinner label={t("Loading more media…")} />}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {total > 1 ? (
          <div className="media-preview-dialog__controls">
            {!hasMore && total <= MAX_DOTS ? (
              <div className="media-preview-dialog__dots">
                <CarouselDots />
              </div>
            ) : null}
            <CarouselCounter
              className="media-preview-dialog__counter"
              format={(index) => <>{index} / {total}</>}
            />
          </div>
        ) : null}
      </div>
      {albumDialogOpen && current ? (
        <Suspense fallback={null}>
          <SaveToAlbumDialog
            mediaIds={[current.id]}
            portalContainer={dialogRef.current}
            onClose={() => {
              setAlbumDialogOpen(false);
              albumButtonRef.current?.focus();
            }}
          />
        </Suspense>
      ) : null}
    </dialog>
  );
}
