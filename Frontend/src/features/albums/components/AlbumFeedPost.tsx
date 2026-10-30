import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useInView } from "motion/react";
import { motionTokens, useShouldReduceMotion, useTempoTransition } from "@animate-ui/react/utils/motion";
import { Link, useNavigate } from "react-router-dom";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { X } from "@/components/animate-ui/icons/x";
import { ConfirmationDialog, showToast } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { mediaService } from "../../media/services/mediaService";
import { ApiError } from "../../../services/api";
import { formatTimestamp, mediaPreviewUrl } from "../../../utils/media";
import { useInvalidateAlbums } from "../hooks/useAlbums";
import { albumService } from "../services/albumService";
import type { Album } from "../types";
import "./album-feed.css";

interface Props {
  album: Album;
  canDelete: boolean;
}

export function AlbumFeedPost({ album, canDelete }: Props) {
  const { t, language } = useLocale();
  const captionId = useId();
  const shouldReduceMotion = useShouldReduceMotion();
  const captionTransition = useTempoTransition(motionTokens.transition.reveal);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidateAlbums = useInvalidateAlbums();
  const [deleting, setDeleting] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [captionHasOverflow, setCaptionHasOverflow] = useState(false);
  const [collapsedCaptionHeight, setCollapsedCaptionHeight] = useState<number>();
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const previewRef = useRef<HTMLAnchorElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const inView = useInView(previewRef, { margin: "200px 0px" });
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewId = album.previewMediaId;
  const failed = previewId !== null && failedPreview === previewId;
  const albumPath = `/albums/${album.id}`;
  const openLabel = t("Open album {name}", { name: album.name });
  const favorite = useMutation({
    mutationFn: ({ mediaId, isFavorited }: { mediaId: string; isFavorited: boolean }) => isFavorited
      ? mediaService.unfavorite(mediaId)
      : mediaService.favorite(mediaId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["media"] }),
        invalidateAlbums(),
      ]);
    },
    onError: (error) => showToast.error(
      error instanceof ApiError ? error.message : t("Could not update favorites."),
    ),
  });

  const clearClick = () => {
    if (clickTimer.current !== null) clearTimeout(clickTimer.current);
    clickTimer.current = null;
  };
  useEffect(() => () => {
    if (clickTimer.current !== null) clearTimeout(clickTimer.current);
  }, []);
  useEffect(() => {
    setCaptionExpanded(false);
  }, [album.caption]);
  useEffect(() => {
    const caption = captionRef.current;
    if (!caption) return;

    const updateOverflow = () => {
      const collapsedHeight = parseFloat(getComputedStyle(caption).lineHeight) * 3;
      setCollapsedCaptionHeight(collapsedHeight);
      setCaptionHasOverflow(caption.scrollHeight > collapsedHeight + 1);
    };
    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(caption);
    return () => observer.disconnect();
  }, [album.caption]);

  const addFavorite = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    clearClick();
    if (previewId && !album.previewIsFavorited && !favorite.isPending) {
      favorite.mutate({ mediaId: previewId, isFavorited: false });
    }
  };

  return (
    <article className="album-feed-post" aria-label={album.name}>
      <header className="album-feed-post__header">
        <span className="album-feed-post__avatar" aria-hidden="true">
          {album.owner.username.slice(0, 1).toLocaleUpperCase(language)}
        </span>
        <div className="album-feed-post__identity">
          <span className="album-feed-post__owner">{album.owner.username}</span>
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

      <Link
        ref={previewRef}
        to={albumPath}
        className="album-feed-post__preview"
        aria-label={openLabel}
        aria-description={`${t("{count} media", { count: album.mediaCount })}. ${t("Double-click the preview to add it to favorites.")}`}
        onBlur={clearClick}
        onClick={(event) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
          clearClick();
          if (event.detail === 0) return;
          event.preventDefault();
          if (event.detail === 1) {
            // Delay pointer navigation so a double-click can favorite without leaving Home.
            clickTimer.current = setTimeout(() => {
              clickTimer.current = null;
              navigate(albumPath);
            }, 350);
          }
        }}
        onDoubleClick={addFavorite}
      >
        {previewId ? (
          failed ? <span className="album-feed-post__placeholder">{t("Could not load preview.")}</span> : inView ? (
            <img
              key={`${previewId}-${attempt}`}
              src={`${mediaPreviewUrl(previewId)}${attempt ? `&previewRetry=${attempt}` : ""}`}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => setFailedPreview(previewId)}
            />
          ) : null
        ) : (
          <span className="album-feed-post__placeholder"><Bookmark size={36} aria-hidden="true" />{t("No preview image")}</span>
        )}
        <span className="album-feed-post__count" aria-hidden="true">{album.mediaCount}</span>
      </Link>

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

      <div className="album-feed-post__body">
        <h2><Link to={albumPath}>{album.name}</Link></h2>
        {album.caption ? (
          <>
            <motion.div
              id={captionId}
              className="album-feed-post__caption"
              initial={false}
              animate={{ height: captionExpanded || !captionHasOverflow ? "auto" : collapsedCaptionHeight }}
              transition={shouldReduceMotion ? { duration: 0 } : captionTransition}
            >
              <p ref={captionRef}>{album.caption}</p>
            </motion.div>
            {captionHasOverflow || captionExpanded ? (
              <button
                type="button"
                className="album-feed-post__caption-toggle"
                aria-expanded={captionExpanded}
                aria-controls={captionId}
                onClick={() => setCaptionExpanded((expanded) => !expanded)}
              >
                {t(captionExpanded ? "Show less" : "Show more")}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
      {deleting ? (
        <ConfirmationDialog
          title="Delete album?"
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
