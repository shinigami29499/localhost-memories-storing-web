import { registerUiModule } from "@/features/ui-resources/uiModules";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Check } from "@/components/animate-ui/icons/check";
import { Copy } from "@/components/animate-ui/icons/copy";
import { Heart } from "@/components/animate-ui/icons/heart";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { MapPin } from "@/components/animate-ui/icons/map-pin";
import { X } from "@/components/animate-ui/icons/x";
import { ErrorState, IconButton, Spinner } from "@/components/ui";
import { MobileMediaFavoriteButton } from "./MobileMediaFavoriteButton";
import { MobileVideoPlayer, type MobileVideoAudio } from "./MobileVideoPlayer";
import type { MediaFile } from "@/features/media/types";
import { mediaPreviewUrl, mediaUrl } from "@/utils/media";
import { CopyButton,CopyButtonIcon } from "@animate-ui/react/primitives/buttons/copy";
import {
CarouselCounter,
CarouselDots,
} from "@animate-ui/react/primitives/carousel";
import { Particles,ParticlesEffect } from "@animate-ui/react/primitives/effects/particles";
import { lazy, Suspense, useLayoutEffect, useState } from "react";
import { useMobilePhotoZoom } from "./useMobilePhotoZoom";
import "./mobile-media-tiles.css";

const SaveToAlbumDialog = lazy(registerUiModule("Save to album dialog", () => import("./MobileSaveToAlbumDialog").then((module) => ({ default: module.MobileSaveToAlbumDialog }))));

const MAX_DOTS = 20;


function PreviewSlide(props: PreviewSlideProps & { immersive: boolean }) {
  const { media, active, preloadOriginal, favoriteBurst, onFavoriteBurstEnd, immersive } = props;
  const { t, stageRef, inView, previewUrl, originalUrl, failedUrls, setFailedUrls, loadedOriginalUrl, reduceMotion, handleOriginalLoad, handlePreviewError, handleOriginalError } = usePreviewSlide(props);
  const immersiveVideo = immersive && media.mediaKind === "video";

return (
    <div ref={stageRef} className="media-preview-dialog__stage" data-active={active}
      data-video-stage={immersiveVideo && active ? media.id : undefined}>
      {!active && !inView ? null : failedUrls.has(previewUrl) && !active ? (
        <p role={active ? "alert" : undefined}>{t("Could not load this media.")}</p>
      ) : media.mediaKind === "video" && active && !immersive ? (
        <MobileVideoPlayer key={originalUrl} src={originalUrl} poster={previewUrl} name={media.originalFilename}
          onError={() => setFailedUrls((current) => new Set(current).add(originalUrl))} />
      ) : (
        <>
          <img
            className="media-preview-dialog__preview-image"
            src={previewUrl}
            alt={media.originalFilename}
            loading={active ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            onLoad={(event) => event.currentTarget.style.setProperty("--media-aspect", String(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight))}
            onError={handlePreviewError}
          />
          {active && media.mediaKind === "image" && loadedOriginalUrl === originalUrl ? (
            <img
              className="media-preview-dialog__original-image"
              src={originalUrl}
              alt={media.originalFilename}
              decoding="async"
              draggable={false}
              onLoad={(event) => event.currentTarget.style.setProperty("--media-aspect", String(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight))}
              onError={handleOriginalError}
            />
          ) : null}
          {(active || preloadOriginal) && media.mediaKind === "image" && loadedOriginalUrl !== originalUrl ? (
            <OriginalImageLoader
              key={originalUrl}
              src={originalUrl}
              onLoad={handleOriginalLoad}
              onError={handleOriginalError}
            />
          ) : null}
        </>
      )}
      {active && favoriteBurst !== null ? (
        <span key={favoriteBurst} className="media-preview-dialog__heart-burst" aria-hidden="true" onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) onFavoriteBurstEnd(favoriteBurst);
        }}>
          <Particles animate={!reduceMotion}>
            <span className="media-preview-dialog__heart-burst-icon">
              <Heart size={96} fill="currentColor" style={{ color: "var(--heart-active)" }} animate={false} />
            </span>
            <ParticlesEffect style={{ top: "50%", left: "50%" }} className="media-preview-dialog__favorite-particle" />
          </Particles>
        </span>
      ) : null}
    </div>
  );
}

import { OriginalImageLoader } from "@/features/media/components/OriginalImageLoader";
import { usePreviewSlide,type PreviewSlideProps } from "@/features/media/components/usePreviewSlide";

import { useMediaPreviewDialog,type MediaPreviewDialogProps } from "@/features/media/components/useMediaPreviewDialog";

export function MobileMediaPreviewDialog(props: MediaPreviewDialogProps & {
  immersive?: boolean; videoAudio?: MobileVideoAudio; initialVideoTime?: number;
}) {
  const { media, total = media.length, loadingMore = false, loadMoreError = false, onLoadMore, favoriteBusy = false, immersive = false, videoAudio } = props;
  const { reset, canDrag, handlers } = useMobilePhotoZoom();
  const { t, dialogRef, closeRef, albumButtonRef, albumDialogOpen, setAlbumDialogOpen, copyingImage, favoriteBurst, setFavoriteBurst, hasMore, loop, slideCount, carouselRef, api, current, currentIndex, albums, inAlbum, imageCopied, close, toggleFavorite, copyImage, goToLocation, closeAlbum } = useMediaPreviewDialog(props, immersive, immersive ? canDrag : undefined);
  const photoZoom = immersive && current?.mediaKind === "image";
  const immersiveVideo = immersive && current?.mediaKind === "video";
  const [videoStage, setVideoStage] = useState<HTMLElement | null>(null);
  const [entryVideoTime, setEntryVideoTime] = useState(props.initialVideoTime ?? 0);
  const CloseButton = immersive ? IconButton : "button";
  useLayoutEffect(reset, [current?.id, reset]);
  useLayoutEffect(() => {
    setVideoStage(immersiveVideo ? dialogRef.current?.querySelector<HTMLElement>("[data-video-stage]") ?? null : null);
    if (current?.id !== props.initialMediaId) setEntryVideoTime(0);
  }, [current?.id, dialogRef, immersiveVideo, props.initialMediaId]);
  if (media.length === 0) return null;

  function dismissViewer() {
    const dialog = dialogRef.current;
    if (!immersive || !dialog?.open) {
      close();
      return;
    }
    if (dialog.hasAttribute("data-closing")) return;
    dialog.style.setProperty("--viewer-exit-opacity", getComputedStyle(dialog).opacity);
    dialog.dataset.closing = "";
    const fade = dialog.getAnimations().find((entry) =>
      entry instanceof CSSAnimation && entry.animationName === "mobile-viewer-exit");
    if (!fade) {
      close();
      return;
    }
    const finish = () => { if (dialog.isConnected && dialog.open) close(); };
    void fade.finished.then(finish, finish);
  }

  return (
    <dialog
      ref={dialogRef}
      className="media-lightbox media-preview-dialog"
      data-immersive={immersive || undefined}
      data-immersive-video={immersiveVideo || undefined}
      onClose={immersive ? (event) => { if (!event.currentTarget.open) close(); } : undefined}
      aria-label={t("Media viewer")}
      onCancel={(event) => {
        event.preventDefault();
        if (!albumDialogOpen) dismissViewer();
      }}
      onClick={(event) => {
        if (immersive || albumDialogOpen) return;
        const target = event.target;
        if (target === event.currentTarget || (target instanceof Element && target.matches(
          ".media-preview-dialog__content, .media-preview-dialog__viewport, .media-preview-dialog__track, .media-preview-dialog__item, .media-preview-dialog__stage",
        ))) close();
      }}
      onKeyDown={(event) => {
        if (albumDialogOpen) return;
        if (event.target instanceof Element && event.target.closest(".video-player, input, textarea")) return;
        if (event.key === "ArrowLeft" && slideCount > 1) {
          event.preventDefault();
          api?.scrollPrev();
        } else if (event.key === "ArrowRight" && slideCount > 1) {
          event.preventDefault();
          api?.scrollNext();
        }
      }}
    >
      <CloseButton
        ref={closeRef}
        type="button"
        className="viewer-icon-btn media-lightbox__close"
        aria-label={t(immersiveVideo ? "Close media preview" : "Close image preview")}
        title={immersive ? undefined : t("Close image preview")}
        onClick={dismissViewer}
      >
        <X size={immersive ? 18 : 20} aria-hidden="true" />
      </CloseButton>
      {current && !immersive ? <div className="media-preview-dialog__actions">
        
        {current.mediaKind === "image" ? (
          <AnimateIcon animateOnHover completeOnStop asChild>
            <CopyButton
              content={mediaUrl(current.id)}
              copied={imageCopied}
              type="button"
              className="viewer-icon-btn media-preview-dialog__action"
              aria-label={t(imageCopied ? "Image copied" : "Copy image")}
              title={t(imageCopied ? "Image copied" : "Copy image")}
              aria-busy={copyingImage || undefined}
              disabled={copyingImage}
              onClick={(event) => {
                // Image copying replaces the primitive's default text write.
                event.preventDefault();
                void copyImage();
              }}
            >
              <CopyButtonIcon
                icon={copyingImage ? (
                  <LoaderCircle size={20} className="spinner__wheel" aria-hidden="true" />
                ) : (
                  <Copy size={20} aria-hidden="true" />
                )}
                copiedIcon={<Check size={20} aria-hidden="true" />}
                aria-hidden="true"
              />
            </CopyButton>
          </AnimateIcon>
        ) : null}
        <MobileMediaFavoriteButton
          key={current.id}
          isFavorited={current.isFavorited}
          busy={favoriteBusy}
          onToggle={toggleFavorite}
        />
        <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
          <button
            ref={albumButtonRef}
            type="button"
            className="viewer-icon-btn media-preview-dialog__action media-preview-dialog__album-action"
            aria-label={t("Save to album")}
            title={t("Save to album")}
            aria-pressed={inAlbum}
            aria-busy={albums.isPending || undefined}
            onClick={() => setAlbumDialogOpen(true)}
          >
            <Bookmark
              size={20}
              fill={inAlbum ? "currentColor" : "none"}
              style={{ color: inAlbum ? "var(--bookmark-active)" : "inherit" }}
              aria-hidden="true"
            />
          </button>
        </AnimateIcon>
        {current.mediaKind === "image" ? (
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <button
              type="button"
              className="viewer-icon-btn media-preview-dialog__action"
              aria-label={t(current.location ? "View photo location" : "Set photo location")}
              title={t(current.location ? "View photo location" : "Set photo location")}
              onClick={goToLocation}
            >
              <MapPin
                size={20}
                stroke="currentColor"
                aria-hidden="true"
              />
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
        <div ref={carouselRef} className="media-preview-dialog__viewport" data-slot="carousel-content"
          data-photo-zoom={photoZoom || undefined} {...(photoZoom ? handlers : undefined)}>
          <div className="media-preview-dialog__track">
            {media.map((item, index) => {
              const distance = Math.abs(index - currentIndex);
              const nearbyDistance = loop ? Math.min(distance, media.length - distance) : distance;
              return (
              <div
                key={item.id}
                className="media-preview-dialog__item"
                data-slot="carousel-item"
                role="group"
                aria-roledescription="slide"
                aria-label={t("Media {current} of {total}", { current: index + 1, total })}
              >
                <PreviewSlide
                  media={item}
                  immersive={immersive}
                  active={item.id === current?.id}
                  preloadOriginal={nearbyDistance <= 2}
                  includeDeleted={false}
                  favoriteBurst={favoriteBurst?.mediaId === item.id ? favoriteBurst.revision : null}
                  onFavoriteBurstEnd={(revision) => setFavoriteBurst((currentBurst) =>
                    currentBurst?.mediaId === item.id && currentBurst.revision === revision ? null : currentBurst)}
                />
              </div>
              );
            })}
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
                  ) : <Spinner label={t("Loading more media...")} />}
                </div>
              </div>
            ) : null}
          </div>
        </div>
          {!immersive && <div className="media-preview-dialog__controls">
            {!hasMore && total > 1 && total <= MAX_DOTS ? (
              <div className="media-preview-dialog__dots">
                <CarouselDots />
              </div>
            ) : null}
            <CarouselCounter
              className="media-preview-dialog__counter"
              format={(current) => <>{current} {t("of {total}", { total })}</>}
            />
          </div>}
      </div>
      {immersiveVideo && current && (
        <MobileVideoPlayer immersive stage={videoStage?.dataset.videoStage === current.id ? videoStage : null}
          src={mediaUrl(current.id)} poster={mediaPreviewUrl(current.id)} name={current.originalFilename}
          audio={videoAudio} startTime={current.id === props.initialMediaId ? entryVideoTime : 0} />
      )}
      {albumDialogOpen && current ? (
        <Suspense fallback={null}>
          <SaveToAlbumDialog
            mediaIds={[current.id]}
            portalContainer={dialogRef.current}
            onClose={closeAlbum}
          />
        </Suspense>
      ) : null}
    </dialog>
  );
}
