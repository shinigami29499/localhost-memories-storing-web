import { addDays, eachDayOfInterval, endOfMonth, format, min, startOfDay, startOfMonth } from "date-fns";
import { SwappingText } from "@animate-ui/react/primitives/texts/swapping";
import { ArrowUpToLine, Image, SendHorizontal } from "lucide-react";
import { AnimatePresence, motion, usePresence } from "motion/react";
import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type PointerEvent, type ReactNode } from "react";
import type { LinkProps } from "react-router-dom";
import { Heart } from "@/components/animate-ui/icons/heart";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { EmptyState, ErrorState, IconButton } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { mediaPreviewUrl } from "../../../utils/media";
import { useAnimationStore } from "../../../store/animationStore";
import type { Album } from "../types";
import { animateAlbumCarousel, captureAlbumCarousel, type AlbumCarouselMotion } from "./albumCarouselMotion";
import "./album-date-view.css";

type AlbumDateViewProps = {
  AlbumLink: ComponentType<LinkProps>;
  today: Date;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  albumDates: readonly string[];
  albums: Album[];
  albumIndex: number;
  onAlbumIndexChange: (index: number) => void;
  onAlbumOpen: (index: number) => void;
  favoriteBusyAlbumId: string | null;
  onFavorite: (albumId: string, isFavorited: boolean) => void;
  mobileNavigation?: boolean;
  footerAction?: ReactNode;
  pending: boolean;
  failed: boolean;
  fetching: boolean;
  onRetry: () => void;
};

function AlbumDateBar({ today, selectedDate, onDateChange, albumDates, onDateStep }:
  Pick<AlbumDateViewProps, "today" | "selectedDate" | "onDateChange" | "albumDates"> & {
    onDateStep?: (direction: 1 | -1) => void;
  }) {
  const { t, language } = useLocale();
  const stripRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number; left: number } | null>(null);
  const dragged = useRef(false);
  const month = new Intl.DateTimeFormat(language, { month: "long", year: "numeric" });
  const weekday = new Intl.DateTimeFormat(language, { weekday: "short" });
  const fullDate = new Intl.DateTimeFormat(language, { dateStyle: "full" });
  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const occupiedDates = useMemo(() => new Set(albumDates), [albumDates]);
  const start = startOfMonth(selectedDate).getTime();
  const end = min([endOfMonth(start), startOfDay(today)]).getTime();
  const days = useMemo(() => eachDayOfInterval({ start, end }), [start, end]);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    const button = strip?.querySelector<HTMLElement>(`[data-date="${selectedKey}"]`);
    if (!strip || !button) return;
    const active = button.getBoundingClientRect();
    strip.scrollLeft += active.left - strip.getBoundingClientRect().left + (active.width - strip.clientWidth) / 2;
  }, [days, selectedKey]);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const tiles = Array.from(strip.querySelectorAll<HTMLButtonElement>("button[data-date]"));
    let frame = 0;

    const update = () => {
      frame = 0;
      const bounds = strip.getBoundingClientRect();
      const gutter = parseFloat(getComputedStyle(strip).scrollPaddingInlineStart);
      const scales = tiles.map((tile) => {
        const { left, right, width } = tile.getBoundingClientRect();
        if (!width) return 1;
        const overlap = Math.max(0, bounds.left + gutter - left, right - (bounds.right - gutter));
        if (overlap <= 1) return 1;
        return 1 - 0.28 * Math.min(1, overlap / width);
      });
      tiles.forEach((tile, index) => tile.style.setProperty("--album-date-scale", scales[index].toFixed(3)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(strip);
    strip.addEventListener("scroll", schedule, { passive: true });
    update();
    return () => {
      resize.disconnect();
      strip.removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, [days]);

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
  };

  return (
    <div className="album-date-view__bar" role="group" aria-label={t("Album dates")}>
      <div className="album-date-view__month" aria-live="polite">{month.format(selectedDate)}</div>
      <div className="album-date-view__days" ref={stripRef}
        onKeyDown={(event) => {
          if (!(event.target instanceof HTMLButtonElement)) return;
          const next = event.key === "ArrowLeft" ? event.target.previousElementSibling
            : event.key === "ArrowRight" ? event.target.nextElementSibling : null;
          if (!(next instanceof HTMLButtonElement)) return;
          event.preventDefault();
          next.focus();
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          dragged.current = false;
          if (event.pointerType === "touch" && !onDateStep) return;
          drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || start.pointerId !== event.pointerId) return;
          if (event.pointerType === "touch") return;
          const delta = event.clientX - start.x;
          if (!dragged.current) {
            if (Math.abs(delta) < 6) return;
            dragged.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.dataset.dragging = "";
          }
          event.preventDefault();
          event.currentTarget.scrollLeft = start.left - delta;
        }}
        onPointerUp={(event) => {
          const start = drag.current;
          endDrag(event);
          if (event.pointerType !== "touch" || start?.pointerId !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          dragged.current = Math.hypot(dx, dy) > 10;
          if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) onDateStep?.(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={endDrag} onLostPointerCapture={endDrag}
        onPointerLeave={(event) => { if (!dragged.current) endDrag(event); }}
        onClickCapture={(event) => {
          if (!dragged.current || event.detail === 0) return;
          event.preventDefault();
          event.stopPropagation();
        }}>
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const hasAlbums = occupiedDates.has(key);
          return (
            <button key={key} type="button" className="album-date-view__day" data-date={key} data-has-albums={hasAlbums || undefined}
              aria-label={fullDate.format(day)} aria-description={hasAlbums ? t("Has albums") : undefined} aria-pressed={key === selectedKey}
              tabIndex={key === selectedKey ? 0 : -1}
              onClick={() => onDateChange(day)}>
              <span className="album-date-view__day-tile">
                <span>{weekday.format(day)}</span>
                <span className="album-date-view__day-number">{day.getDate()}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const AlbumFrameFade = forwardRef<HTMLDivElement, { className: string; children: ReactNode }>(
  function AlbumFrameFade({ className, children }, ref) {
    const element = useRef<HTMLDivElement>(null);
    const [present, remove] = usePresence();
    useImperativeHandle(ref, () => element.current!, []);

    useLayoutEffect(() => {
      const frame = element.current;
      if (present || !frame) return;
      const fade = frame.animate([{ opacity: getComputedStyle(frame).opacity }, { opacity: 0 }], {
        duration: 200,
        easing: "ease-in-out",
        fill: "forwards",
      });
      void fade.finished.then(() => remove?.(), () => {});
      return () => fade.cancel();
    }, [present, remove]);

    return (
      <motion.div ref={element} className={className} inert={!present} aria-hidden={!present || undefined}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}>
        {children}
      </motion.div>
    );
  },
);

function AlbumTextPlaceholder() {
  return (
    <span className="album-date-card__text-placeholder" aria-hidden="true">
      <span className="album-date-card__placeholder-name" />
      <span className="album-date-card__placeholder-owner" />
    </span>
  );
}

function AlbumFramePlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`album-date-card album-date-card--${compact ? "compact" : "featured"} album-date-card--placeholder`} aria-hidden="true">
      <div className="album-date-card__heading">
        <AlbumTextPlaceholder />
        {!compact && (
          <div className="album-date-card__actions">
            <span className="album-date-card__placeholder-action" />
            <span className="album-date-card__placeholder-action" />
          </div>
        )}
      </div>
      <div className="album-date-card__preview-slot">
        <div className="album-date-card__preview" data-cover-loading>
          <span className="album-date-card__cover-placeholder">
            <Image className="album-date-card__cover-icon" />
          </span>
        </div>
      </div>
    </div>
  );
}

function AlbumFrame({ animate, className, frame, children }: {
  animate: boolean;
  className: string;
  frame: "placeholder" | "album" | null;
  children: ReactNode;
}) {
  if (!animate) return frame && <div className={className}>{children}</div>;

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {frame && <AlbumFrameFade key={frame} className={className}>{children}</AlbumFrameFade>}
    </AnimatePresence>
  );
}

function DatedAlbumCard({ album, action, onAdvance, swapText, showCoverLoading }: {
  album: Album;
  swapText: boolean;
  showCoverLoading?: boolean;
  action?: {
    Link: AlbumDateViewProps["AlbumLink"];
    onOpen: () => void;
    onFavorite: () => void;
    favoriteBusy: boolean;
  };
  onAdvance?: () => void;
}) {
  const { t } = useLocale();
  const imageRef = useRef<HTMLImageElement>(null);
  const [result, setResult] = useState<{ src: string; status: "loaded" | "failed" }>();
  const src = album.previewMediaId ? mediaPreviewUrl(album.previewMediaId) : undefined;
  const status = result?.src === src ? result?.status : undefined;
  const hasPreview = Boolean(src && status !== "failed");
  const loading = Boolean(showCoverLoading && hasPreview && status !== "loaded");
  const Title = action ? "h2" : "span";

  useLayoutEffect(() => {
    const image = imageRef.current;
    if (showCoverLoading && src && image?.complete && image.naturalWidth > 0) {
      setResult({ src, status: "loaded" });
    }
  }, [showCoverLoading, src]);

  const content = (
    <>
      <div className="album-date-card__heading">
        <div className="album-date-card__text" data-cover-loading={loading || undefined}>
          {loading && <AlbumTextPlaceholder />}
          <Title className="album-date-card__name">
            {swapText ? <SwappingText text={album.name} stagger={0.025} /> : album.name}
          </Title>
          <span className="album-date-card__owner">
            {swapText ? <SwappingText text={album.owner.username} stagger={0.025} /> : album.owner.username}
          </span>
        </div>
        {action && (
          <div className="album-date-card__actions">
            <IconButton
              className="album-date-card__favorite"
              shape="circle"
              aria-label={t(album.isFavorited ? "Remove from favorites" : "Add to favorites")}
              title={t(album.isFavorited ? "Remove from favorites" : "Add to favorites")}
              aria-pressed={album.isFavorited}
              aria-busy={action.favoriteBusy || undefined}
              disabled={action.favoriteBusy}
              onClick={action.onFavorite}
            >
              {action.favoriteBusy
                ? <LoaderCircle className="spinner__wheel" color="inherit" animate={false} />
                : <Heart size={20} className="album-date-card__favorite-heart"
                    color="inherit" fill={album.isFavorited ? "currentColor" : "none"}
                    animateOnHover animateOnTap={false} animateOnView={false} />}
            </IconButton>
            <action.Link to={`/album/${album.id}`}
              className="icon-button icon-button--button icon-button--circle album-date-card__open"
              aria-label={t("Open album {name}", { name: album.name })}
              title={t("Open album {name}", { name: album.name })} draggable={false}
              onClick={(event) => {
                if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                  action.onOpen();
                }
              }}>
              <span className="icon-button__icon" aria-hidden="true"><SendHorizontal /></span>
            </action.Link>
          </div>
        )}
      </div>
      <div className="album-date-card__preview-slot">
        <div className="album-date-card__preview" data-press-motion-target={!action || undefined}
          data-cover-loading={loading || undefined} data-empty={!hasPreview || undefined}>
          {src && hasPreview && (
            <img key={src} ref={imageRef} src={src} alt="" decoding="async" draggable={false}
              onLoad={showCoverLoading ? () => setResult({ src, status: "loaded" }) : undefined}
              onError={() => setResult({ src, status: "failed" })} />
          )}
          {(loading || !hasPreview) && (
            <span className="album-date-card__cover-placeholder">
              <Image className="album-date-card__cover-icon" aria-hidden="true" />
              {action && !hasPreview && <span>{t("No cover available")}</span>}
            </span>
          )}
        </div>
      </div>
    </>
  );

  if (action) return <article className="album-date-card album-date-card--featured">{content}</article>;
  return (
    <button type="button" className="album-date-card album-date-card--compact"
      aria-label={`${t("Next album")}: ${album.name}`} title={`${t("Next album")}: ${album.name}`}
      onClick={onAdvance}>
      {content}
    </button>
  );
}

export function AlbumDateView({
  AlbumLink, today, selectedDate, onDateChange, albumDates, albums, albumIndex, onAlbumIndexChange, onAlbumOpen,
  favoriteBusyAlbumId, onFavorite, mobileNavigation, footerAction,
  pending, failed, fetching, onRetry,
}: AlbumDateViewProps) {
  const { t } = useLocale();
  const motionEnabled = useAnimationStore((state) => state.enabled);
  const iconsEnabled = useAnimationStore((state) => state.iconsEnabled);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animate = motionEnabled && !reducedMotion;
  const swapText = Boolean(mobileNavigation && animate);
  const cardKey = mobileNavigation ? undefined : selectedDate.getTime();
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pendingMotion = useRef<AlbumCarouselMotion | null>(null);
  const cancelMotion = useRef<(() => void) | null>(null);
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const featured = albums[albumIndex];
  const next = albums[albumIndex + 1];
  const showPlaceholders = pending;
  const showMoveUp = Boolean(featured && albumIndex > 0 && !pending);

  useLayoutEffect(() => {
    const previous = pendingMotion.current;
    pendingMotion.current = null;
    if (previous && stageRef.current && overlayRef.current) {
      const cleanup = animateAlbumCarousel(stageRef.current, overlayRef.current, previous);
      cancelMotion.current = cleanup;
      return () => {
        cleanup();
        cancelMotion.current = null;
      };
    }
  }, [albumIndex, selectedDate, featured?.id, next?.id, animate]);

  const moveTo = (index: number) => {
    if (index === albumIndex || index < 0 || index >= albums.length) return;
    const stage = stageRef.current;
    const hasNextAtTarget = Boolean(albums[index + 1]);
    if (stage && animate && Math.abs(index - albumIndex) === 1 &&
      (!mobileNavigation || Boolean(next) === hasNextAtTarget)) {
      cancelMotion.current?.();
      pendingMotion.current = captureAlbumCarousel(stage, index > albumIndex ? 1 : -1, {
        hideQueue: !hasNextAtTarget,
        fadeCaptions: !mobileNavigation,
      });
    }
    if (!hasNextAtTarget &&
      stage?.querySelector("button.album-date-card--compact:not([inert] *)") === document.activeElement) {
      stage?.querySelector<HTMLElement>(".album-date-card__open")?.focus({ preventScroll: true });
    }
    onAlbumIndexChange(index);
  };

  const move = (direction: 1 | -1) => moveTo(albumIndex + direction);
  const stepDate = (direction: 1 | -1) => {
    const date = addDays(startOfDay(selectedDate), direction);
    if (date <= startOfDay(today)) onDateChange(date);
  };
  const featuredCard = featured && (
    <DatedAlbumCard key={cardKey} album={featured} swapText={swapText} showCoverLoading action={{
      Link: AlbumLink,
      onOpen: () => onAlbumOpen(albumIndex),
      onFavorite: () => onFavorite(featured.id, featured.isFavorited),
      favoriteBusy: favoriteBusyAlbumId === featured.id,
    }} />
  );
  const nextCard = next && (
    <>
      <h2 className="album-date-view__queue-title">{t("Next Album")}</h2>
      <DatedAlbumCard key={cardKey} album={next} swapText={swapText} showCoverLoading onAdvance={() => move(1)} />
    </>
  );

  return (
    <>
      <AlbumDateBar today={today} selectedDate={selectedDate} albumDates={albumDates}
        onDateStep={mobileNavigation ? stepDate : undefined}
        onDateChange={(date) => {
          if (mobileNavigation && date.getTime() === startOfDay(selectedDate).getTime()) moveTo(0);
          else onDateChange(date);
        }} />
      {showPlaceholders && <span className="sr-only" role="status">{t("Loading albums...")}</span>}
      <div className="album-date-view__viewport" aria-busy={pending || fetching} data-frame-loading={showPlaceholders || undefined}>
        <div className="album-date-view__body" ref={stageRef} data-has-queue={Boolean(mobileNavigation || featured || footerAction) || undefined}
          data-icon-motion={iconsEnabled || undefined}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            move(event.key === "ArrowUp" ? 1 : -1);
          }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0 || (!featured && !mobileNavigation)) return;
            suppressClick.current = false;
            pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          }}
          onPointerMove={(event) => {
            const start = pointerStart.current;
            if (start?.id !== event.pointerId) return;
            const dx = Math.abs(event.clientX - start.x);
            const dy = Math.abs(event.clientY - start.y);
            if (Math.max(dx, dy) > 10 && (mobileNavigation || dy > dx) &&
              !event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.setPointerCapture(event.pointerId);
            }
          }}
          onPointerUp={(event) => {
            const start = pointerStart.current;
            if (start?.id !== event.pointerId) return;
            pointerStart.current = null;
            const dy = event.clientY - start.y;
            const dx = event.clientX - start.x;
            suppressClick.current = Math.hypot(dx, dy) > 10;
            if (mobileNavigation && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
              stepDate(dx < 0 ? 1 : -1);
              return;
            }
            if (Math.abs(dy) < 40 || Math.abs(dy) <= Math.abs(dx)) return;
            move(dy < 0 ? 1 : -1);
          }}
          onPointerCancel={() => { pointerStart.current = null; }}
          onClickCapture={(event) => {
            if (!suppressClick.current || event.detail === 0) return;
            event.preventDefault();
            event.stopPropagation();
          }}>
          {mobileNavigation && (
            <AlbumFrame animate={animate} className="album-date-view__main-frame"
              frame={showPlaceholders ? "placeholder" : featured ? "album" : null}>
              {showPlaceholders ? <AlbumFramePlaceholder /> : featuredCard}
            </AlbumFrame>
          )}
          {pending ? !mobileNavigation && <AlbumFramePlaceholder /> : failed && !featured ? (
            <ErrorState message={t("Could not load albums.")} onRetry={onRetry} />
          ) : !featured ? (
            <EmptyState title="No albums yet" hint={mobileNavigation
              ? "Choose Add album to get started."
              : "Use New album to organize your media into collections."} />
          ) : !mobileNavigation && featuredCard}
          {(mobileNavigation || pending || featured) && <div className="album-date-view__queue">
            {mobileNavigation ? (
              <AlbumFrame animate={animate} className="album-date-view__sub-frame"
                frame={showPlaceholders ? "placeholder" : next ? "album" : null}>
                {showPlaceholders ? (
                  <>
                    <span className="album-date-view__queue-title album-date-view__placeholder-label" aria-hidden="true" />
                    <AlbumFramePlaceholder compact />
                  </>
                ) : nextCard}
              </AlbumFrame>
            ) : pending ? <AlbumFramePlaceholder compact /> : nextCard}
            {mobileNavigation && <IconButton className="album-date-view__move-up"
              data-visible={showMoveUp || undefined} disabled={!showMoveUp} aria-hidden={!showMoveUp || undefined}
              aria-label={t("Move up")} title={t("Move up")}
              onClick={() => {
                stageRef.current?.querySelector<HTMLElement>(".album-date-card__open")?.focus({ preventScroll: true });
                moveTo(0);
              }}>
              <ArrowUpToLine size={20} />
            </IconButton>}
          </div>}
          <div ref={overlayRef} className="album-date-view__motion" aria-hidden="true" inert />
        </div>
        {footerAction}
      </div>
    </>
  );
}
