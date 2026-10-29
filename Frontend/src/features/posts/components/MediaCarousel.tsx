import useEmblaCarousel, { CarouselCounter, CarouselDots } from "@animate-ui/react/primitives/carousel";
import { SlidingNumber } from "@animate-ui/react/primitives/texts/sliding-number";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "../../../context/LocaleContext";
import { mediaUrl } from "../../../utils/media";
import type { MediaFile } from "../types";

export function MediaCarousel({ media, initialIndex, onSelectedChange }: {
  media: MediaFile[];
  initialIndex: number;
  onSelectedChange?: (index: number) => void;
}) {
  const { t } = useLocale();
  const [selected, setSelected] = useState(initialIndex);
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const videos = useRef(new Map<string, HTMLVideoElement>());
  const reduceMotion = useShouldReduceMotion();
  const dotsRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const repeated = media.length > 1 && media.length < 5;
  const slides = repeated ? Array.from({ length: Math.ceil(5 / media.length) }, () => media).flat() : media;
  const [viewportRef, api] = useEmblaCarousel({
    loop: true,
    align: "center",
    containScroll: false,
    startIndex: initialIndex,
    scale: 0.45,
    visible: media.length > 1 ? 3 : 1,
    watchDrag: (_api, event) => !(event.target instanceof Element && event.target.closest("video, a, button:not(.media-carousel__select)")),
  });
  const onSelect = useCallback(() => {
    if (!api) return;
    const next = api.selectedScrollSnap();
    setSelected(next % media.length);
    videos.current.forEach((video, id) => {
      if (id !== String(next) && !video.paused) video.pause();
    });
  }, [api, media]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    onSelectedChange?.(selected);
  }, [selected, onSelectedChange]);

  useEffect(() => {
    if (!api || !repeated) return;
    const updateIndicator = () => {
      const dots = dotsRef.current;
      const indicator = indicatorRef.current;
      if (!dots || !indicator) return;
      const progress = reduceMotion
        ? api.selectedScrollSnap() % media.length
        : ((api.scrollProgress() * slides.length) % media.length + media.length) % media.length;
      const source = Math.floor(progress);
      const fraction = progress - source;
      const buttons = dots.querySelectorAll("button");
      const start = buttons[source];
      const end = buttons[(source + 1) % media.length];
      if (!start || !end) return;
      const distance = end.offsetLeft - start.offsetLeft;
      const front = start.offsetLeft + distance * Math.min(fraction * 2, 1);
      const back = start.offsetLeft + distance * Math.max(fraction * 2 - 1, 0);
      indicator.style.left = `${Math.min(front, back)}px`;
      indicator.style.width = `${Math.abs(front - back) + start.offsetWidth}px`;
    };
    updateIndicator();
    api.on("scroll", updateIndicator);
    api.on("reInit", updateIndicator);
    api.on("select", updateIndicator);
    return () => {
      api.off("scroll", updateIndicator);
      api.off("reInit", updateIndicator);
      api.off("select", updateIndicator);
    };
  }, [api, repeated, media.length, slides.length, reduceMotion]);

  return (
    <div
      className="media-carousel"
      data-slot="carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={t("Post photos and videos")}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target instanceof Element && event.target.closest("video")) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          if (event.key === "ArrowLeft") api?.scrollPrev();
          else api?.scrollNext();
        }
      }}
    >
      <div className={`media-carousel__images${media.length === 1 ? " media-carousel__images--single" : ""}`}>
      <div className="media-carousel__viewport" ref={viewportRef}>
        <div className="media-carousel__track">
          {slides.map((file, index) => (
            <div className="media-carousel__item" key={`${file.id}-${index}`} role="group" aria-roledescription="slide" aria-label={t("Slide {current} of {total}", { current: index % media.length + 1, total: media.length })}>
              <div className="media-carousel__card">
                {index !== (api?.selectedScrollSnap() ?? initialIndex) ? (
                  <button
                    type="button"
                    className="media-carousel__select"
                    aria-label={t("Show media {current}", { current: index % media.length + 1 })}
                    onClick={(event) => {
                      if (!api) return;
                      const viewport = api.rootNode().getBoundingClientRect();
                      const preview = event.currentTarget.getBoundingClientRect();
                      if (preview.left + preview.width / 2 < viewport.left + viewport.width / 2) api.scrollPrev();
                      else api.scrollNext();
                    }}
                  />
                ) : null}
                {failedIds.has(file.id) ? (
                  <p role={index === selected ? "alert" : undefined}>{t("Could not load this media.")}</p>
                ) : file.mediaKind === "image" ? (
                  <img
                    src={mediaUrl(file.id)}
                    alt={file.originalFilename}
                    draggable={false}
                    onLoad={(event) => {
                      const image = event.currentTarget;
                      image.parentElement?.style.setProperty("--media-aspect", String(image.naturalWidth / image.naturalHeight));
                    }}
                    onError={() => setFailedIds((ids) => new Set(ids).add(file.id))}
                  />
                ) : file.mediaKind === "video" ? (
                  <video
                    ref={(video) => { if (video) videos.current.set(String(index), video); else videos.current.delete(String(index)); }}
                    src={mediaUrl(file.id)}
                    controls={api?.selectedScrollSnap() === index}
                    preload="metadata"
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget;
                      if (video.videoWidth > 0 && video.videoHeight > 0) {
                        video.parentElement?.style.setProperty("--media-aspect", String(video.videoWidth / video.videoHeight));
                      }
                    }}
                    onError={() => setFailedIds((ids) => new Set(ids).add(file.id))}
                  />
                ) : (
                  <div>
                    <p>{t("Unsupported media type ({mimeType})", { mimeType: file.mimeType })}</p>
                    <a href={mediaUrl(file.id)} download={file.originalFilename}>{t("Download")}</a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      {media.length > 1 ? (
        <>
          <div className="media-carousel__controls">
            {repeated ? (
              <>
                <div ref={dotsRef} className="media-carousel__logical-dots" aria-label={t("Choose media")}>
                  {media.map((file, index) => (
                    <button
                      key={file.id}
                      type="button"
                      aria-label={t("Show media {current}", { current: index + 1 })}
                      aria-current={selected === index ? "true" : undefined}
                      onClick={() => {
                        if (!api) return;
                        const current = api.selectedScrollSnap();
                        const candidates = slides.flatMap((_file, slideIndex) => slideIndex % media.length === index ? [slideIndex] : []);
                        const distance = (target: number) => Math.min(Math.abs(target - current), slides.length - Math.abs(target - current));
                        api.scrollTo(candidates.reduce((nearest, target) => distance(target) < distance(nearest) ? target : nearest));
                      }}
                    />
                  ))}
                  <span ref={indicatorRef} className="media-carousel__logical-indicator" aria-hidden="true" />
                </div>
                <div className="media-carousel__counter" aria-live="polite">
                  {t("Slide")} {reduceMotion ? selected + 1 : <SlidingNumber number={selected + 1} initiallyStable />} {t("of")} {media.length}
                </div>
              </>
            ) : (
              <>
                <CarouselDots className="media-carousel__dots" aria-label={t("Choose media")} />
                <CarouselCounter className="media-carousel__counter" format={(current, count) => <>{t("Slide")} {current} {t("of")} {count}</>} />
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
