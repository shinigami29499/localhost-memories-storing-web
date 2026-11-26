import { Slider } from "@base-ui/react/slider";
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ImageIcon } from "@/components/animate-ui/icons/image";
import { IconButton } from "@/components/ui";
import { useLocale } from "@/context/LocaleContext";
import { useInfiniteAlbumMedia } from "@/features/albums/hooks/useAlbums";
import { useAnimationStore } from "@/store/animationStore";
import { mediaPreviewUrl, mediaUrl } from "@/utils/media";
import { MobileMediaPreviewDialog } from "./MobileMediaPreviewDialog";

const PREVIEW_INTERVAL = 4000;
const HOLD_THRESHOLD = 350;
const DRAG_THRESHOLD = 8;
const DEFAULT_VOLUME = 75;

export function MobileAlbumImageCarousel({ albumId, mediaCount }: { albumId: string; mediaCount?: number }) {
  const { t } = useLocale();
  const motionEnabled = useAnimationStore((state) => state.enabled);
  const query = useInfiniteAlbumMedia(albumId, 20, mediaCount !== 0);
  const media = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? mediaCount ?? 0;
  const track = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const soundButton = useRef<HTMLButtonElement>(null);
  const press = useRef<{ pointerId: number; started: number; x: number; scrollLeft: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [index, setIndex] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewStartTime, setPreviewStartTime] = useState(0);
  const [holding, setHolding] = useState(false);
  const [sound, setSound] = useState({ volume: DEFAULT_VOLUME, muted: true });
  const [failedVideos, setFailedVideos] = useState<Set<string>>(() => new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const active = Math.min(index, Math.max(0, media.length - 1));
  const current = media[active];
  const videoId = current?.mediaKind === "video" && !failedVideos.has(current.id) ? current.id : undefined;
  const { volume, muted } = sound;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  const { fetchNextPage, hasNextPage, isFetching, isFetchNextPageError } = query;
  const closePreview = useCallback(() => setPreviewId(null), []);
  const loadMore = useCallback(() => void fetchNextPage({ cancelRefetch: false }), [fetchNextPage]);

  useEffect(() => {
    if (hasNextPage && !isFetching && !isFetchNextPageError && active >= media.length - 3) {
      loadMore();
    }
  }, [active, media.length, hasNextPage, isFetching, isFetchNextPageError, loadMore]);

  const goTo = useCallback((next: number, instant = false) => {
    const viewport = track.current;
    if (!viewport || next < 0 || next >= media.length) return;
    const rtl = getComputedStyle(viewport).direction === "rtl";
    const animate = !instant && motionEnabled && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewport.scrollTo({ left: next * viewport.clientWidth * (rtl ? -1 : 1), behavior: animate ? "smooth" : "instant" });
  }, [media.length, motionEnabled]);

  useEffect(() => {
    if (holding || previewId || media.length < 2) return;
    const atEnd = active === media.length - 1;
    if (atEnd && hasNextPage && !isFetchNextPageError) return;
    const timer = window.setTimeout(() => {
      if (!press.current) goTo(atEnd ? 0 : active + 1, atEnd);
    }, PREVIEW_INTERVAL);
    return () => window.clearTimeout(timer);
  }, [active, goTo, hasNextPage, holding, isFetchNextPageError, media.length, previewId, sound]);

  useLayoutEffect(() => {
    if (video.current) {
      video.current.volume = volume / 100;
      video.current.muted = muted;
    }
  }, [volume, muted, videoId]);

  useEffect(() => {
    const player = video.current;
    if (!player) return;
    if (!videoId || holding || previewId) player.pause();
    else void player.play().catch(() => {});
  }, [holding, previewId, videoId]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const gesture = press.current;
      const viewport = track.current;
      if (!gesture || event.pointerId !== gesture.pointerId || event.pointerType !== "mouse" || !viewport) return;
      const offset = event.clientX - gesture.x;
      if (!gesture.dragging && Math.abs(offset) < DRAG_THRESHOLD) return;
      if (!gesture.dragging) {
        gesture.dragging = true;
        viewport.style.scrollSnapType = "none";
      }
      viewport.scrollLeft = gesture.scrollLeft - offset;
    };
    const release = (event?: PointerEvent) => {
      const gesture = press.current;
      if (!gesture || (event && event.pointerId !== gesture.pointerId)) return;
      suppressClick.current = gesture.dragging || event?.type !== "pointerup" ||
        performance.now() - gesture.started >= HOLD_THRESHOLD;
      press.current = null;
      const viewport = track.current;
      if (gesture.dragging && viewport?.clientWidth) {
        const next = Math.round(Math.abs(viewport.scrollLeft) / viewport.clientWidth);
        viewport.style.removeProperty("scroll-snap-type");
        goTo(next);
      }
      setHolding(false);
    };
    const blur = () => release();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", blur);
    };
  }, [goTo]);

  function changeSound(level: number, nextMuted: boolean) {
    const player = video.current;
    if (player) {
      player.volume = level / 100;
      player.muted = nextMuted;
      if (!nextMuted && videoId && player.paused && !holding && !previewId) {
        void player.play().catch(() => {});
      }
    }
    setSound({ volume: level, muted: nextMuted });
  }

  if (!media.length) {
    return <div className="mobile-album-carousel__empty">
      <ImageIcon size={24} aria-hidden="true" />
      {mediaCount !== 0 && query.isPending ? t("Loading media...") : t("No cover available")}
      {query.isError && <button type="button" className="btn btn--secondary"
        onClick={() => void query.refetch()}>{t("Try again")}</button>}
    </div>;
  }

  const dotCount = Math.min(total, 5);
  const firstDot = Math.min(Math.max(0, active - 2), total - dotCount);
  const activeDot = active - firstDot;
  return <section className="mobile-album-carousel" aria-label={t("Album media")}>
    <div className="mobile-album-carousel__track" ref={track} tabIndex={total > 1 ? 0 : undefined}
      onScroll={({ currentTarget }) => {
        if (!currentTarget.clientWidth) return;
        const next = Math.round(Math.abs(currentTarget.scrollLeft) / currentTarget.clientWidth);
        setIndex(next);
      }}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        suppressClick.current = false;
        press.current = {
          pointerId: event.pointerId, started: performance.now(), x: event.clientX,
          scrollLeft: event.currentTarget.scrollLeft, dragging: false,
        };
        setHolding(true);
      }}
      onContextMenu={(event) => { if (press.current) event.preventDefault(); }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        goTo(active + ((event.key === "ArrowRight") !== rtl ? 1 : -1));
      }}>
      {media.map((item, i) => <div className="mobile-album-carousel__slide" key={item.id} aria-hidden={i !== active}>
        <button type="button" className="mobile-album-carousel__open" data-press-motion="off" tabIndex={i === active ? 0 : -1}
          aria-haspopup="dialog" aria-label={item.originalFilename} onClick={(event) => {
            if (event.detail !== 0 && (press.current || suppressClick.current)) return;
            setPreviewStartTime(item.id === videoId ? video.current?.currentTime ?? 0 : 0);
            video.current?.pause();
            setPreviewId(item.id);
          }}>
          {failedImages.has(item.id) ? (
            <span className="mobile-album-carousel__empty"><ImageIcon size={24} aria-hidden="true" />{t("No cover available")}</span>
          ) : (
            <img src={mediaPreviewUrl(item.id)} alt="" draggable={false} loading={i <= 1 ? "eager" : "lazy"}
              onError={() => setFailedImages((previous) => new Set(previous).add(item.id))} />
          )}
        </button>
      </div>)}
      <video ref={video} className="mobile-album-carousel__inline-video" hidden={!videoId}
        style={{ insetInlineStart: `${active * 100}%` }} src={videoId ? mediaUrl(videoId) : undefined}
        poster={videoId ? mediaPreviewUrl(videoId) : undefined} muted={muted} playsInline loop
        aria-hidden="true" disablePictureInPicture
        onError={() => { if (videoId) setFailedVideos((previous) => new Set(previous).add(videoId)); }} />
    </div>
    <div className="mobile-album-carousel__sound" data-visible={Boolean(videoId)} data-expanded={Boolean(videoId && !muted)}
      inert={!videoId} aria-hidden={!videoId} onKeyDown={(event) => {
        if (event.key !== "Escape" || muted) return;
        changeSound(volume, true);
        soundButton.current?.focus();
      }}>
      <IconButton ref={soundButton} shape="rounded-square" aria-label={t(muted ? "Unmute video" : "Mute video")}
        aria-expanded={!muted} onClick={() => changeSound(volume || DEFAULT_VOLUME, !muted)}>
        <VolumeIcon />
      </IconButton>
      <div className="mobile-album-carousel__volume-reveal" aria-hidden={muted} inert={muted}>
        <Slider.Root className="mobile-album-carousel__volume" value={[volume]} min={0} max={100} step={1}
          thumbAlignment="edge" onValueChange={([level]) => changeSound(level, false)}>
          <Slider.Control className="mobile-album-carousel__volume-control">
            <Slider.Track className="mobile-album-carousel__volume-track">
              <Slider.Indicator className="mobile-album-carousel__volume-fill" />
            </Slider.Track>
            <Slider.Thumb className="mobile-album-carousel__volume-thumb" aria-label={t("Video volume")} />
          </Slider.Control>
        </Slider.Root>
      </div>
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
      onClick={loadMore}>{t("Try again")}</button>}
    {previewId && <MobileMediaPreviewDialog immersive videoAudio={{ ...sound, onChange: changeSound }}
      initialVideoTime={previewStartTime} media={media} initialMediaId={previewId}
      total={total} loadingMore={isFetching} loadMoreError={isFetchNextPageError} onLoadMore={loadMore} onClose={closePreview} />}
  </section>;
}
