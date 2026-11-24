import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "@/components/animate-ui/icons/image";
import { useLocale } from "@/context/LocaleContext";
import { useInfiniteAlbumMedia } from "@/features/albums/hooks/useAlbums";
import { useAnimationStore } from "@/store/animationStore";
import { mediaPreviewUrl } from "@/utils/media";

export function MobileAlbumImageCarousel({ albumId, imageCount }: { albumId: string; imageCount?: number }) {
  const { t } = useLocale();
  const motionEnabled = useAnimationStore((state) => state.enabled);
  const query = useInfiniteAlbumMedia(albumId, 20, imageCount !== 0, "image");
  const images = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? imageCount ?? 0;
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const active = Math.min(index, Math.max(0, images.length - 1));
  const { fetchNextPage, hasNextPage, isFetching, isFetchNextPageError } = query;

  useEffect(() => {
    if (hasNextPage && !isFetching && !isFetchNextPageError && active >= images.length - 3) {
      void fetchNextPage();
    }
  }, [active, images.length, hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);

  function goTo(next: number) {
    const viewport = track.current;
    if (!viewport || next < 0 || next >= images.length) return;
    const rtl = getComputedStyle(viewport).direction === "rtl";
    const animate = motionEnabled && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewport.scrollTo({ left: next * viewport.clientWidth * (rtl ? -1 : 1), behavior: animate ? "smooth" : "instant" });
  }

  if (!images.length) {
    return <div className="mobile-album-carousel__empty">
      <ImageIcon size={24} aria-hidden="true" />
      {imageCount !== 0 && query.isPending ? t("Loading media...") : t("No cover available")}
      {query.isError && <button type="button" className="btn btn--secondary"
        onClick={() => void query.refetch()}>{t("Try again")}</button>}
    </div>;
  }

  const dotCount = Math.min(total, 5);
  const firstDot = Math.min(Math.max(0, active - 2), total - dotCount);
  const activeDot = active - firstDot;
  return <section className="mobile-album-carousel" aria-label={t("Images")}>
    <div className="mobile-album-carousel__track" ref={track} tabIndex={total > 1 ? 0 : undefined}
      onScroll={({ currentTarget }) => {
        if (currentTarget.clientWidth) setIndex(Math.round(Math.abs(currentTarget.scrollLeft) / currentTarget.clientWidth));
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        goTo(active + ((event.key === "ArrowRight") !== rtl ? 1 : -1));
      }}>
      {images.map((image, i) => <div className="mobile-album-carousel__slide" key={image.id} aria-hidden={i !== active}>
        {failedImages.has(image.id) ? (
          <div className="mobile-album-carousel__empty"><ImageIcon size={24} aria-hidden="true" />{t("No cover available")}</div>
        ) : (
          <img src={mediaPreviewUrl(image.id)} alt={image.originalFilename} draggable={false} loading={i === 0 ? "eager" : "lazy"}
            onError={() => setFailedImages((previous) => new Set(previous).add(image.id))} />
        )}
      </div>)}
    </div>
    {total > 1 && <div className="mobile-album-carousel__dots" aria-hidden="true">
      {Array.from({ length: dotCount }, (_, slot) => (
        <span key={slot} data-active={slot === activeDot || undefined} />
      ))}
    </div>}
    {total > 1 && <span className="sr-only" aria-live="polite">
      {t("Media {current} of {total}", { current: active + 1, total })}
    </span>}
    {isFetchNextPageError && <button type="button" className="btn btn--secondary mobile-album-carousel__retry"
      onClick={() => void fetchNextPage()}>{t("Try again")}</button>}
  </section>;
}
