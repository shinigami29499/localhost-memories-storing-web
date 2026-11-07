import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useNavigate } from "react-router-dom";
import { motionTokens, useShouldReduceMotion, useTempoTransition } from "@animate-ui/react/utils/motion";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { X } from "@/components/animate-ui/icons/x";
import { ConfirmationDialog } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { formatTimestamp, mediaPreviewUrl } from "../../../utils/media";
import { useInfiniteAlbumMedia, useInvalidateAlbums } from "../hooks/useAlbums";
import { albumService } from "../services/albumService";
import { useCaptionPreview } from "../hooks/useCaptionPreview";
import type { Album } from "../types";
import "./album-feed.css";

interface Props {
  album: Album;
  canDelete: boolean;
}

function FeedCaption({ caption }: { caption: string }) {
  const { textRef, preview } = useCaptionPreview<HTMLParagraphElement>(caption);
  return <div className="album-feed-post__caption"><p ref={textRef}>{preview}</p></div>;
}

export function AlbumFeedPost({ album, canDelete }: Props) {
  const { t, language } = useLocale();
  const navigate = useNavigate();
  const shouldReduceMotion = useShouldReduceMotion();
  const captionTransition = useTempoTransition(motionTokens.transition.reveal);
  const invalidateAlbums = useInvalidateAlbums();
  const [deleting, setDeleting] = useState(false);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const inView = useInView(previewRef, { margin: "200px 0px" });
  const [imageIndex, setImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const media = useInfiniteAlbumMedia(album.id, 5, inView && album.mediaCount > 0);
  const items = media.data?.pages.flatMap((page) => page.items) ?? [];
  const previewId = items[imageIndex]?.id ?? (!media.data ? album.previewMediaId : null);
  const failed = previewId !== null && failedPreview === previewId;
  const previousImage = () => {
    if (imageIndex > 0) {
      setSlideDirection(-1);
      setImageIndex((index) => index - 1);
    }
  };
  const nextImage = async () => {
    if (imageIndex + 1 < items.length) {
      setSlideDirection(1);
      setImageIndex((index) => index + 1);
    } else if (media.hasNextPage && !media.isFetchingNextPage) {
      const result = await media.fetchNextPage();
      if (result.data && result.data.pages.flatMap((page) => page.items).length > imageIndex + 1) {
        setSlideDirection(1);
        setImageIndex((index) => index + 1);
      }
    }
  };
  return (
    <article className="album-feed-post" aria-label={album.name}>
      <header className="album-feed-post__header">
        <UserAvatar user={album.owner} className="album-feed-post__avatar" />
        <div className="album-feed-post__identity">
          <strong className="album-feed-post__title">{album.name}</strong>
          <span className="album-feed-post__owner"><span className="album-feed-post__owner-prefix">{t("by")} </span><strong>{album.owner.username}</strong></span>
          <div className="album-feed-post__meta">
            <time dateTime={album.createdAt}>
              {formatTimestamp(album.createdAt, language)}
            </time>
            <span aria-hidden="true"> · </span>
            <span>{t(album.isPublic ? "Public" : "Private")}</span>
          </div>
        </div>
        {canDelete ? (
          <button
            type="button"
            className="album-feed-post__action album-feed-post__delete"
            aria-label={t("Delete album {name}", { name: album.name })}
            title={t("Delete album?")}
            onClick={() => setDeleting(true)}
          >
            <X size={22} aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <div
        ref={previewRef}
        className="album-feed-post__preview"
        role="region"
        aria-label={t("Album images")}
        aria-keyshortcuts="ArrowLeft ArrowRight"
        title={t("Open album {name}", { name: album.name })}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") { event.preventDefault(); void nextImage(); }
          if (event.key === "ArrowLeft") { event.preventDefault(); previousImage(); }
          if (event.key === "Enter") { event.preventDefault(); navigate(`/gallery/album/${album.id}`); }
        }}
        onClick={() => {
          if (suppressClick.current) { suppressClick.current = false; return; }
          navigate(`/gallery/album/${album.id}`);
        }}
        onPointerDown={(event) => { suppressClick.current = false; swipeStart.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={(event) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          if (!start) return;
          const dx = event.clientX - start.x;
          suppressClick.current = Math.hypot(dx, event.clientY - start.y) >= 10;
          if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(event.clientY - start.y)) return;
          if (dx < 0) void nextImage();
          else previousImage();
        }}
        onPointerCancel={() => { swipeStart.current = null; }}
      >
        {previewId ? (
          failed ? <span className="album-feed-post__placeholder">{t("Could not load preview.")}</span> : inView ? (
            <AnimatePresence initial={false} custom={slideDirection}>
            <motion.img
              key={`${previewId}-${attempt}`}
              custom={slideDirection}
              variants={{
                enter: (direction: number) => ({ x: shouldReduceMotion ? 0 : `${direction * 100}%`, opacity: shouldReduceMotion ? 0 : 1 }),
                center: { x: 0, opacity: 1 },
                exit: (direction: number) => ({ x: shouldReduceMotion ? 0 : `${direction * -100}%`, opacity: shouldReduceMotion ? 0 : 1 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={shouldReduceMotion ? { duration: 0 } : captionTransition}
              src={`${mediaPreviewUrl(previewId)}${attempt ? `&previewRetry=${attempt}` : ""}`}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => setFailedPreview(previewId)}
            />
            </AnimatePresence>
          ) : null
        ) : (
          <span className="album-feed-post__placeholder"><Bookmark size={36} aria-hidden="true" style={{ color: "var(--bookmark-active)", fill: "var(--bookmark-active)" }} />{t("No preview image")}</span>
        )}
        {items.length > 0 && <span className="album-feed-post__count" aria-live="polite">{imageIndex + 1} / {media.data?.pages[0].total}</span>}
      </div>

      {media.isError && <div className="album-feed-post__actions"><button type="button" className="album-feed-post__retry" onClick={() => void (media.isFetchNextPageError ? media.fetchNextPage() : media.refetch())}>{t("Could not load media.")} {t("Retry")}</button></div>}

      {failed ? (
        <div className="album-feed-post__actions">
          <button
            type="button"
            className="album-feed-post__retry"
            aria-label={t("Retry preview")}
            onClick={() => { setFailedPreview(null); setAttempt((value) => value + 1); }}
          >
            {t("Retry preview")}
          </button>
        </div>
      ) : null}

      {album.caption?.trim() ? (
        <div className="album-feed-post__body">
          <FeedCaption caption={album.caption} />
        </div>
      ) : null}
      {deleting ? (
        <ConfirmationDialog
          title="Delete album?"
          confirmLabel="Delete album"
          danger
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await albumService.remove(album.id);
            await invalidateAlbums();
          }}
        >
          {t("The album “{name}” will be deleted. Saved media stay in your gallery.", { name: album.name })}
        </ConfirmationDialog>
      ) : null}
    </article>
  );
}
