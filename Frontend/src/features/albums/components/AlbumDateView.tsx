import { addDays, eachDayOfInterval, endOfMonth, format, min, startOfDay, startOfMonth } from "date-fns";
import { AvatarGroup, AvatarGroupTooltip, AvatarGroupTooltipArrow } from "@animate-ui/react/primitives/avatar-group";
import { SlidingNumber } from "@animate-ui/react/primitives/texts/sliding-number";
import { SwappingText } from "@animate-ui/react/primitives/texts/swapping";
import { ArrowUpToLine, CalendarDays, Image, SendHorizontal, Video } from "lucide-react";
import { AnimatePresence, motion, useIsPresent, usePresence, usePresenceData } from "motion/react";
import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type PointerEvent, type ReactNode } from "react";
import type { LinkProps } from "react-router-dom";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { Heart } from "@/components/animate-ui/icons/heart";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { EmptyState, ErrorState, IconButton } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { useDelayedPlaceholder } from "../../../hooks/useDelayedPlaceholder";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { mediaPreviewUrl } from "../../../utils/media";
import { useAnimationStore } from "../../../store/animationStore";
import type { Album } from "../types";
import { AlbumDateSheet, type AlbumDateHistory } from "./AlbumDateSheet";
import { animateAlbumCarousel, captureAlbumCarousel, type AlbumCarouselMotion } from "./albumCarouselMotion";
import "./album-date-view.css";

type AlbumDateViewProps = {
  AlbumLink: ComponentType<LinkProps>;
  today: Date;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  albumDateCounts: ReadonlyMap<string, number>;
  albumHistory?: AlbumDateHistory;
  albums: Album[];
  albumIndex: number;
  onAlbumIndexChange: (index: number) => void;
  onAlbumOpen: (index: number) => void;
  favoriteBusyAlbumId: string | null;
  onFavorite: (albumId: string, isFavorited: boolean) => void;
  mobileNavigation?: boolean;
  revealFeaturedText?: boolean;
  pending: boolean;
  failed: boolean;
  fetching: boolean;
  onRetry: () => void;
};

function AlbumDateBar({ today, selectedDate, onDateChange, albumDateCounts, albumHistory, animate }:
  Pick<AlbumDateViewProps, "today" | "selectedDate" | "onDateChange" | "albumDateCounts" | "albumHistory"> & { animate: boolean }) {
  const { t, language } = useLocale();
  const [pickerOpen, setPickerOpen] = useState(false);
  const monthTrigger = useRef<HTMLButtonElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; left: number } | null>(null);
  const dragged = useRef(false);
  const month = new Intl.DateTimeFormat(language, { month: "long", year: "numeric" });
  const weekday = new Intl.DateTimeFormat(language, { weekday: "short" });
  const fullDate = new Intl.DateTimeFormat(language, { dateStyle: "full" });
  const selectedKey = format(selectedDate, "yyyy-MM-dd");
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
      <div className="album-date-view__month">
        {albumHistory ? (
          <button ref={monthTrigger} className="album-date-view__month-trigger" type="button"
            aria-haspopup="dialog" aria-expanded={pickerOpen} onClick={() => setPickerOpen(true)}>
            {month.format(selectedDate)}
            <CalendarDays className="album-date-view__month-icon" size={16} aria-hidden="true" />
          </button>
        ) : <span className="album-date-view__month-label">{month.format(selectedDate)}</span>}
        {albumHistory && pickerOpen && (
          <AlbumDateSheet today={today} selectedDate={selectedDate} albumDateCounts={albumDateCounts}
            history={albumHistory} animate={animate} onSelect={onDateChange}
            onDismiss={() => {
              setPickerOpen(false);
              monthTrigger.current?.focus({ preventScroll: true });
            }} />
        )}
      </div>
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
          if (event.pointerType === "touch") return;
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
        onPointerUp={endDrag}
        onPointerCancel={endDrag} onLostPointerCapture={endDrag}
        onPointerLeave={(event) => { if (!dragged.current) endDrag(event); }}
        onClickCapture={(event) => {
          if (!dragged.current || event.detail === 0) return;
          event.preventDefault();
          event.stopPropagation();
        }}>
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const hasAlbums = albumDateCounts.has(key);
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

const AlbumFrameFade = forwardRef<HTMLDivElement, { className: string; children: ReactNode; instant: boolean }>(
  function AlbumFrameFade({ className, children, instant }, ref) {
    const element = useRef<HTMLDivElement>(null);
    const [present, remove] = usePresence();
    const exitInstant = usePresenceData() as boolean;
    useImperativeHandle(ref, () => element.current!, []);

    useEffect(() => {
      // AnimatePresence registers the exit in its layout effect.
      if (!present && exitInstant) remove?.();
    }, [present, exitInstant, remove]);

    useLayoutEffect(() => {
      const frame = element.current;
      if (present || exitInstant || !frame) return;
      const fade = frame.animate([{ opacity: getComputedStyle(frame).opacity }, { opacity: 0 }], {
        duration: 200,
        easing: "ease-in-out",
        fill: "forwards",
      });
      void fade.finished.then(() => remove?.(), () => {});
      return () => fade.cancel();
    }, [present, remove, exitInstant]);

    return (
      <motion.div ref={element} className={className} inert={!present} aria-hidden={!present || undefined}
        style={!present && exitInstant ? { display: "none" } : undefined}
        initial={instant ? false : { opacity: 0 }} animate={{ opacity: 1 }}
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

function AlbumFrame({ animate, instant, className, frame, children }: {
  animate: boolean;
  instant: boolean;
  className: string;
  frame: "placeholder" | "album" | null;
  children: ReactNode;
}) {
  const wasAnimated = useRef(false);
  useLayoutEffect(() => { wasAnimated.current = animate; }, [animate]);
  if (!animate) return frame && <div className={className}>{children}</div>;

  return (
    <AnimatePresence mode="popLayout" custom={instant}>
      {/* Skip the first frame fade without suppressing later character animations inside it. */}
      {frame && <AlbumFrameFade key={frame} className={className} instant={instant || !wasAnimated.current}>{children}</AlbumFrameFade>}
    </AnimatePresence>
  );
}

function DatedAlbumCard({ album, action, onAdvance, swapText, showCoverLoading, revealText, dateKey }: {
  album: Album;
  swapText: boolean;
  showCoverLoading?: boolean;
  revealText?: boolean;
  dateKey?: number;
  action?: {
    Link: AlbumDateViewProps["AlbumLink"];
    onOpen: () => void;
    onFavorite: () => void;
    favoriteBusy: boolean;
    animateCounts: boolean;
    expanded: boolean;
    onToggleExpanded: () => void;
  };
  onAdvance?: () => void;
}) {
  const { t } = useLocale();
  const imageRef = useRef<HTMLImageElement>(null);
  const isPresent = useIsPresent();
  const touchTooltipWasOpen = useRef<boolean | null>(null);
  const previewClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPreviewClick = useRef(0);
  const expanded = action?.expanded ?? false;
  const [result, setResult] = useState<{ src: string; status: "loaded" | "failed" }>();
  const src = album.previewMediaId ? mediaPreviewUrl(album.previewMediaId) : undefined;
  const status = result?.src === src ? result?.status : undefined;
  const hasPreview = Boolean(src && status !== "failed");
  const waitingForCover = Boolean(showCoverLoading && hasPreview && status !== "loaded");
  const loading = useDelayedPlaceholder(waitingForCover, src);
  const hasShownText = useRef(false);
  const previousDateKey = useRef(dateKey);
  const previousAlbumId = useRef(album.id);
  const showText = !waitingForCover || (hasShownText.current && previousDateKey.current === dateKey)
    || (swapText && (revealText || previousAlbumId.current !== album.id));
  useLayoutEffect(() => {
    previousDateKey.current = dateKey;
    previousAlbumId.current = album.id;
    hasShownText.current = showText;
  }, [album.id, dateKey, showText]);
  const Title = action ? "h2" : "span";
  const ownerLabel = `${t(album.isPublic ? "Public" : "Private")} · ${album.owner.username}`;
  const contributors = [album.owner, ...(album.contributors ?? []).filter((user) => user.id !== album.owner.id)].slice(0, 5);
  useLayoutEffect(() => () => {
    if (previewClickTimer.current !== null) clearTimeout(previewClickTimer.current);
    previewClickTimer.current = null;
    lastPreviewClick.current = 0;
  }, [album.id, dateKey, isPresent]);

  useLayoutEffect(() => {
    const image = imageRef.current;
    if (showCoverLoading && src && image?.complete && image.naturalWidth > 0) {
      setResult({ src, status: "loaded" });
    }
  }, [showCoverLoading, src]);

  const content = (
    <>
      <div className="album-date-card__heading">
        <div className="album-date-card__text" data-cover-pending={!showText || undefined}>
          {loading && !showText && <AlbumTextPlaceholder />}
          <Title className="album-date-card__name">
            {swapText ? <SwappingText text={album.name} stagger={0.025} /> : album.name}
          </Title>
          <span className="album-date-card__owner">
            {swapText ? <SwappingText text={ownerLabel} stagger={0.025} /> : ownerLabel}
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
          role={action ? "button" : undefined} tabIndex={action ? 0 : undefined}
          aria-label={action ? t("Show contributors") : undefined} aria-expanded={action ? expanded : undefined}
          onKeyDown={action ? (event) => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); action.onToggleExpanded(); }
          } : undefined}
          onClick={action ? () => {
            const now = Date.now();
            if (now - lastPreviewClick.current < 350) {
              if (previewClickTimer.current) clearTimeout(previewClickTimer.current);
              previewClickTimer.current = null;
              lastPreviewClick.current = 0;
              if (!action.favoriteBusy) action.onFavorite();
              return;
            }
            lastPreviewClick.current = now;
            previewClickTimer.current = setTimeout(() => {
              action.onToggleExpanded();
              previewClickTimer.current = null;
            }, 350);
          } : undefined}
          data-cover-loading={loading || undefined} data-cover-pending={waitingForCover || undefined} data-empty={!hasPreview || undefined}>
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
      {action && (
        <div className="album-date-card__contributors-wrap" data-expanded={expanded || undefined} inert={!expanded}>
          <div className="album-date-card__contributors">
            {album.imageCount != null && album.videoCount != null && <div className="album-date-card__media-counts">
              <span aria-label={`${album.imageCount} ${t("Images")}`}>
                <Image aria-hidden="true" />
                <strong>{expanded && action.animateCounts
                  ? <SlidingNumber number={album.imageCount} fromNumber={album.imageCount === 0 ? 0 : undefined} initiallyStable />
                  : album.imageCount}</strong>
                {" "}{t("Images")}
              </span>
              <span aria-label={`${album.videoCount} ${t("Videos")}`}>
                <Video aria-hidden="true" />
                <strong>{expanded && action.animateCounts
                  ? <SlidingNumber number={album.videoCount} fromNumber={album.videoCount === 0 ? 0 : undefined} initiallyStable />
                  : album.videoCount}</strong>
                {" "}{t("Videos")}
              </span>
            </div>}
            <AvatarGroup key={`${album.id}:${expanded}`} className="album-date-card__avatar-group" invertOverlap sideOffset={19}>
              {contributors.map((user) => (
                <button key={user.id} type="button" className="album-date-card__contributor" aria-label={user.username}
                  onPointerDown={(event) => {
                    touchTooltipWasOpen.current = null;
                    if (event.pointerType !== "touch") return;
                    const trigger = event.currentTarget.closest('[data-slot="tooltip-trigger"]');
                    touchTooltipWasOpen.current = trigger?.getAttribute("data-state") === "open";
                    event.preventDefault();
                  }}
                  onPointerCancel={() => { touchTooltipWasOpen.current = null; }}
                  onClick={(event) => {
                    const wasOpen = touchTooltipWasOpen.current;
                    touchTooltipWasOpen.current = null;
                    if (wasOpen === null || event.detail === 0) return;
                    const button = event.currentTarget;
                    button.blur();
                    if (!wasOpen) button.focus();
                  }}>
                  <UserAvatar user={user} className="album-date-card__contributor-avatar" />
                  <AvatarGroupTooltip className="project-tooltip album-date-card__contributor-tooltip">
                    <AvatarGroupTooltipArrow className="album-date-card__contributor-tooltip-arrow" />
                    <motion.span layout="preserve-aspect">{user.username}</motion.span>
                  </AvatarGroupTooltip>
                </button>
              ))}
            </AvatarGroup>
          </div>
        </div>
      )}
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

const MOVE_UP_CONFIRMATION_MS = 2000;

function AlbumPositionButton({ position, total, dateKey, disabled, animate, onMoveUp }: {
  position: number;
  total: number;
  dateKey: number;
  disabled: boolean;
  animate: boolean;
  onMoveUp: () => void;
}) {
  const { t } = useLocale();
  const maskId = useId();
  const [armedUntil, setArmedUntil] = useState(0);
  const armed = armedUntil > 0;
  const totalText = t("of {total}", { total });
  const [totalPrefix, totalSuffix] = t("of {total}", { total: "__total__" }).split("__total__");
  const actionLabel = t(armed ? "Move up" : disabled ? "Album position" : "Show Move up");
  const segment = 1 / Math.max(1, total);
  const gap = total > 1 ? Math.min(0.018, segment * 0.25) : 0;
  const emptyFraction = total ? (total - position) / total : 1;

  useLayoutEffect(() => { setArmedUntil(0); }, [dateKey, position, total, disabled]);
  useEffect(() => {
    if (!armedUntil) return;
    const timer = window.setTimeout(() => setArmedUntil(0), Math.max(0, armedUntil - performance.now()));
    return () => window.clearTimeout(timer);
  }, [armedUntil]);

  return (
    <IconButton className="album-date-view__move-up" size="fab" data-armed={armed || undefined}
      disabled={disabled} aria-label={actionLabel} aria-description={`${position} ${totalText}`} title={actionLabel}
      onClick={() => {
        const now = performance.now();
        if (now < armedUntil) {
          setArmedUntil(0);
          onMoveUp();
        } else {
          setArmedUntil(now + MOVE_UP_CONFIRMATION_MS);
        }
      }}>
      <svg className="album-date-view__move-up-ring" viewBox="0 0 56 56" fill="none">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="56" height="56">
            <circle cx="28" cy="28" r="25.5" pathLength="1" stroke="white" strokeWidth="4"
              strokeDasharray={gap ? `${segment - gap} ${gap}` : undefined} strokeDashoffset={-gap / 2} />
          </mask>
        </defs>
        <g transform="rotate(-90 28 28)" mask={`url(#${maskId})`}>
          <circle className="album-date-view__move-up-track" cx="28" cy="28" r="25.5" />
          <circle className="album-date-view__move-up-progress" cx="28" cy="28" r="25.5"
            pathLength="1" strokeDasharray="1 1" strokeDashoffset={emptyFraction}
            visibility={position ? undefined : "hidden"} />
        </g>
      </svg>
      <span className="album-date-view__move-up-count">
        <span>{animate ? <SlidingNumber number={position} initiallyStable /> : position}</span>{" "}
        <span className="album-date-view__move-up-total">
          {animate ? <>{totalPrefix}<SlidingNumber number={total} initiallyStable />{totalSuffix}</> : totalText}
        </span>
      </span>
      <ArrowUpToLine className="album-date-view__move-up-arrow" />
    </IconButton>
  );
}

export function AlbumDateView({
  AlbumLink, today, selectedDate, onDateChange, albumDateCounts, albumHistory, albums, albumIndex, onAlbumIndexChange, onAlbumOpen,
  favoriteBusyAlbumId, onFavorite, mobileNavigation, revealFeaturedText,
  pending, failed, fetching, onRetry,
}: AlbumDateViewProps) {
  const { t } = useLocale();
  const motionEnabled = useAnimationStore((state) => state.enabled);
  const iconsEnabled = useAnimationStore((state) => state.iconsEnabled);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animate = motionEnabled && !reducedMotion;
  const swapText = Boolean(mobileNavigation && animate);
  const dateKey = selectedDate.getTime();
  const cardKey = mobileNavigation ? undefined : dateKey;
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pendingMotion = useRef<AlbumCarouselMotion | null>(null);
  const cancelMotion = useRef<(() => void) | null>(null);
  const datePush = useRef<{ date: number; direction: number; node: HTMLElement; bounds: DOMRect } | null>(null);
  const cancelDatePush = useRef<(() => void) | null>(null);
  const pointerStart = useRef<{ id: number; x: number; y: number; canStepDate: boolean } | null>(null);
  const suppressClick = useRef(false);
  const featured = albums[albumIndex];
  const next = albums[albumIndex + 1];
  const showError = !pending && failed && !featured;
  const showQueue = !showError && Boolean(mobileNavigation || pending || featured);
  const showPlaceholders = useDelayedPlaceholder(pending);

  useLayoutEffect(() => {
    const push = datePush.current;
    const stage = stageRef.current;
    if (!push || !stage || push.date !== startOfDay(selectedDate).getTime()) return;
    if (!animate || showError) { datePush.current = null; return; }
    if (pending) return;
    datePush.current = null;
    const viewport = stage.parentElement;
    if (!viewport) return;
    const bounds = viewport.getBoundingClientRect();
    Object.assign(push.node.style, {
      position: "absolute", margin: "0", left: `${push.bounds.left - bounds.left}px`,
      top: `${push.bounds.top - bounds.top}px`, width: `${push.bounds.width}px`,
      height: `${push.bounds.height}px`, boxSizing: "border-box", pointerEvents: "none",
    });
    push.node.setAttribute("aria-hidden", "true");
    push.node.setAttribute("inert", "");
    push.node.dataset.datePushExit = "";
    viewport.append(push.node);
    const options: KeyframeAnimationOptions = { duration: 500, easing: "cubic-bezier(.42, 0, .58, 1)" };
    const distance = bounds.width * push.direction;
    const incoming = stage.querySelectorAll<HTMLElement>(
      ".album-date-view__main-frame:not([inert]), .album-date-view__sub-frame:not([inert]), .empty-state",
    );
    const entering = Array.from(incoming, (frame) => frame.animate(
      [{ transform: `translateX(${distance}px)` }, { transform: "translateX(0)" }], options,
    ));
    push.node.querySelector(".album-date-view__move-up")?.remove();
    const exit = push.node.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-distance}px)` }], options);
    const cleanup = () => {
      entering.forEach((animation) => animation.cancel());
      exit.cancel();
      push.node.remove();
      if (cancelDatePush.current === cleanup) cancelDatePush.current = null;
    };
    cancelDatePush.current = cleanup;
    void exit.finished.then(cleanup, cleanup);
    return cleanup;
  }, [selectedDate, featured?.id, animate, showError, pending]);

  const changeDate = (date: Date) => {
    cancelDatePush.current?.();
    const target = startOfDay(date).getTime();
    const current = startOfDay(selectedDate).getTime();
    const source = stageRef.current;
    const targetHasAlbums = (albumDateCounts.get(format(date, "yyyy-MM-dd")) ?? 0) > 0;
    datePush.current = mobileNavigation && animate && source && target !== current && Boolean(featured) !== targetHasAlbums
      ? { date: target, direction: target > current ? 1 : -1, node: source.cloneNode(true) as HTMLElement, bounds: source.getBoundingClientRect() }
      : null;
    onDateChange(date);
  };

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
    if (date <= startOfDay(today)) changeDate(date);
  };
  const featuredCard = featured && (
    <DatedAlbumCard album={featured} swapText={swapText} showCoverLoading revealText={revealFeaturedText} dateKey={cardKey} action={{
      Link: AlbumLink,
      onOpen: () => onAlbumOpen(albumIndex),
      onFavorite: () => onFavorite(featured.id, featured.isFavorited),
      favoriteBusy: favoriteBusyAlbumId === featured.id,
      animateCounts: animate,
      expanded: detailsExpanded,
      onToggleExpanded: () => setDetailsExpanded((current) => !current),
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
      <AlbumDateBar today={today} selectedDate={selectedDate} albumDateCounts={albumDateCounts} albumHistory={albumHistory} animate={animate}
        onDateChange={(date) => {
          if (mobileNavigation && date.getTime() === startOfDay(selectedDate).getTime()) moveTo(0);
          else changeDate(date);
        }} />
      {showPlaceholders && <span className="sr-only" role="status">{t("Loading albums...")}</span>}
      <div className="album-date-view__viewport" aria-busy={pending || fetching} data-frame-loading={pending || undefined}>
        <div className="album-date-view__body" ref={stageRef} data-has-queue={showQueue || undefined}
          data-icon-motion={iconsEnabled || undefined}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            move(event.key === "ArrowUp" ? 1 : -1);
          }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0 || (!featured && !mobileNavigation)) return;
            suppressClick.current = false;
            const canStepDate = Boolean(mobileNavigation && event.target instanceof Element &&
              event.target.closest(".album-date-view__main-frame, .album-date-view__sub-frame"));
            pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY, canStepDate };
          }}
          onPointerMove={(event) => {
            const start = pointerStart.current;
            if (start?.id !== event.pointerId) return;
            const dx = Math.abs(event.clientX - start.x);
            const dy = Math.abs(event.clientY - start.y);
            if (Math.max(dx, dy) > 10 && (start.canStepDate || dy > dx) &&
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
            if (start.canStepDate && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) {
              stepDate(dx < 0 ? 1 : -1);
              return;
            }
            if (Math.abs(dy) < 40 || Math.abs(dy) <= Math.abs(dx)) return;
            move(dy < 0 ? 1 : -1);
          }}
          onPointerCancel={() => { pointerStart.current = null; }}
          onLostPointerCapture={(event) => {
            if (event.target === event.currentTarget) pointerStart.current = null;
          }}
          onClickCapture={(event) => {
            if (!suppressClick.current || event.detail === 0) return;
            event.preventDefault();
            event.stopPropagation();
          }}>
          {mobileNavigation && (
            <AlbumFrame animate={animate} instant={Boolean(datePush.current)} className="album-date-view__main-frame"
              frame={showPlaceholders ? "placeholder" : featured ? "album" : null}>
              {showPlaceholders ? <AlbumFramePlaceholder /> : featuredCard}
            </AlbumFrame>
          )}
          {pending ? !mobileNavigation && showPlaceholders && <AlbumFramePlaceholder /> : showError ? (
            <ErrorState message={t("Could not load albums.")} onRetry={onRetry} />
          ) : !featured ? (
            <EmptyState title="No albums yet" hint={mobileNavigation
              ? "Choose Add album to get started."
              : "Use New album to organize your media into collections."} />
          ) : !mobileNavigation && featuredCard}
          {showQueue && <div className="album-date-view__queue">
            {mobileNavigation ? (
              <AlbumFrame animate={animate} instant={Boolean(datePush.current)} className="album-date-view__sub-frame"
                frame={showPlaceholders ? "placeholder" : next ? "album" : null}>
                {showPlaceholders ? (
                  <>
                    <span className="album-date-view__queue-title album-date-view__placeholder-label" aria-hidden="true" />
                    <AlbumFramePlaceholder compact />
                  </>
                ) : nextCard}
              </AlbumFrame>
            ) : pending ? showPlaceholders && <AlbumFramePlaceholder compact /> : nextCard}
            {mobileNavigation && <AlbumPositionButton position={featured ? albumIndex + 1 : 0} total={albums.length}
              dateKey={dateKey} disabled={!featured || pending} animate={animate}
              onMoveUp={() => {
                stageRef.current?.querySelector<HTMLElement>(".album-date-card__open")?.focus({ preventScroll: true });
                moveTo(0);
              }} />}
          </div>}
          <div ref={overlayRef} className="album-date-view__motion" aria-hidden="true" inert />
        </div>
      </div>
    </>
  );
}
