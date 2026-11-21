import { eachDayOfInterval, endOfMonth, format, min, startOfDay, startOfMonth } from "date-fns";
import { SwappingText } from "@animate-ui/react/primitives/texts/swapping";
import { MoveUp, SendHorizontal } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState, type ComponentType, type PointerEvent } from "react";
import type { LinkProps } from "react-router-dom";
import { EmptyState, ErrorState, IconButton, Spinner } from "../../../components/ui";
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
  pending: boolean;
  failed: boolean;
  fetching: boolean;
  onRetry: () => void;
  onCreate: () => void;
};

function AlbumDateBar({ today, selectedDate, onDateChange, albumDates }: Pick<AlbumDateViewProps, "today" | "selectedDate" | "onDateChange" | "albumDates">) {
  const { t, language } = useLocale();
  const stripRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; left: number } | null>(null);
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
          dragged.current = false;
          if (event.pointerType === "touch" || event.button !== 0) return;
          drag.current = { pointerId: event.pointerId, x: event.clientX, left: event.currentTarget.scrollLeft };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || start.pointerId !== event.pointerId) return;
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
        onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
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

function AlbumSwapText({ text, direction, animate, wrap = false }: {
  text: string;
  direction: "up" | "down";
  animate: boolean;
  wrap?: boolean;
}) {
  if (!animate) return text;
  const words = wrap ? text.split(/(\s+)/) : [text];
  return (
    <>
      <span aria-hidden="true">{words.map((word, index) => word.trim()
        ? <SwappingText key={index} text={word} direction={direction} stagger={0.025} />
        : word)}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}

function DatedAlbumCard({ album, action, direction, animateText }: {
  album: Album;
  action?: { Link: AlbumDateViewProps["AlbumLink"]; onOpen: () => void };
  direction: "up" | "down";
  animateText: boolean;
}) {
  const { t } = useLocale();
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const preview = album.previewMediaId;
  const Title = action ? "h2" : "h3";

  return (
    <article className={`album-date-card album-date-card--${action ? "featured" : "compact"}`}>
      <div className="album-date-card__heading">
        <div className="album-date-card__text">
          <Title className="album-date-card__name">
            <AlbumSwapText text={album.name} direction={direction} animate={animateText} wrap />
          </Title>
          <span className="album-date-card__owner">
            <AlbumSwapText text={t("by {owner}", { owner: album.owner.username })} direction={direction} animate={animateText} />
          </span>
        </div>
        {action && (
          <action.Link to={`/gallery/album/${album.id}`}
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
        )}
      </div>
      <div className="album-date-card__preview-slot">
        <div className="album-date-card__preview">
          {preview && preview !== failedPreview && (
            <img src={mediaPreviewUrl(preview)} alt="" decoding="async" draggable={false} onError={() => setFailedPreview(preview)} />
          )}
        </div>
      </div>
    </article>
  );
}

export function AlbumDateView({
  AlbumLink, today, selectedDate, onDateChange, albumDates, albums, albumIndex, onAlbumIndexChange, onAlbumOpen,
  pending, failed, fetching, onRetry, onCreate,
}: AlbumDateViewProps) {
  const { t } = useLocale();
  const motionEnabled = useAnimationStore((state) => state.enabled);
  const iconsEnabled = useAnimationStore((state) => state.iconsEnabled);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animate = motionEnabled && !reducedMotion;
  const [swapDirection, setSwapDirection] = useState<"up" | "down">("up");
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const advanceIcon = useRef<SVGSVGElement>(null);
  const pendingMotion = useRef<AlbumCarouselMotion | null>(null);
  const cancelMotion = useRef<(() => void) | null>(null);
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const featured = albums[albumIndex];
  const next = albums[albumIndex + 1];

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
  }, [albumIndex, selectedDate, featured?.id, next?.id]);

  const move = (direction: 1 | -1) => {
    const index = albumIndex + direction;
    if (index < 0 || index >= albums.length) return;
    const stage = stageRef.current;
    if (stage && animate) {
      cancelMotion.current?.();
      pendingMotion.current = captureAlbumCarousel(stage, direction, !albums[index + 1]);
      if (direction === 1 && iconsEnabled) {
        advanceIcon.current?.animate(
          [{ transform: "none" }, { transform: "translateY(-4px)" }, { transform: "none" }],
          { duration: 260, easing: "ease-out" },
        );
      }
    }
    if (!albums[index + 1] && advanceIcon.current?.closest("button") === document.activeElement) {
      stage?.querySelector<HTMLElement>(".album-date-card__open")?.focus({ preventScroll: true });
    }
    setSwapDirection(direction === 1 ? "up" : "down");
    onAlbumIndexChange(index);
  };

  return (
    <>
      <AlbumDateBar today={today} selectedDate={selectedDate} albumDates={albumDates} onDateChange={onDateChange} />
      <div className="album-date-view__viewport" aria-busy={fetching}>
        <div className="album-date-view__body" ref={stageRef} data-has-queue={Boolean(featured) || undefined}
          data-icon-motion={iconsEnabled || undefined}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            move(event.key === "ArrowUp" ? 1 : -1);
          }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0 || !featured) return;
            suppressClick.current = false;
            pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          }}
          onPointerMove={(event) => {
            const start = pointerStart.current;
            if (start?.id !== event.pointerId) return;
            const dy = Math.abs(event.clientY - start.y);
            if (dy > 10 && dy > Math.abs(event.clientX - start.x) && !event.currentTarget.hasPointerCapture(event.pointerId)) {
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
            if (Math.abs(dy) < 40 || Math.abs(dy) <= Math.abs(dx)) return;
            move(dy < 0 ? 1 : -1);
          }}
          onPointerCancel={() => { pointerStart.current = null; }}
          onClickCapture={(event) => {
            if (!suppressClick.current || event.detail === 0) return;
            event.preventDefault();
            event.stopPropagation();
          }}>
          {pending ? <Spinner page label={t("Loading albums...")} /> : failed && !featured ? (
            <ErrorState message={t("Could not load albums.")} onRetry={onRetry} />
          ) : !featured ? (
            <EmptyState title="No albums yet" hint="Use New album to organize your media into collections."
              action={<button type="button" className="btn btn--primary" onClick={onCreate}>{t("New album")}</button>} />
          ) : (
            <>
              <DatedAlbumCard key={selectedDate.getTime()} album={featured}
                direction={swapDirection} animateText={animate} action={{ Link: AlbumLink, onOpen: () => onAlbumOpen(albumIndex) }} />
              <div className="album-date-view__queue">
                {next && (
                  <>
                    <h2 className="album-date-view__queue-title">{t("Next Album")}</h2>
                    <DatedAlbumCard key={selectedDate.getTime()} album={next} direction={swapDirection} animateText={animate} />
                    <IconButton className="album-date-view__advance" aria-label={t("Next album")} title={t("Next album")}
                      onClick={() => move(1)}>
                      <MoveUp ref={advanceIcon} size={20} />
                    </IconButton>
                  </>
                )}
              </div>
            </>
          )}
          <div ref={overlayRef} className="album-date-view__motion" aria-hidden="true" inert />
        </div>
      </div>
    </>
  );
}
