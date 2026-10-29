import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { ArrowLeft } from "@/components/animate-ui/icons/arrow-left";
import { Globe } from "@/components/animate-ui/icons/globe";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { Button, ConfirmationDialog, EmptyState, ErrorState, Spinner, showToast } from "../../components/ui";
import { DEFAULT_PAGE_SIZE, Pagination } from "../../components/ui/Pagination";
import { useLocale } from "../../context/LocaleContext";
import {
  AlbumFormDialog,
  albumService,
  useAlbum,
  useAlbumMedia,
  useInvalidateAlbums,
} from "../../features/albums";
import { MediaCard } from "../../features/media/components/MediaCard";
import { mediaService } from "../../features/media/services/mediaService";
import "../../features/media/components/media.css";
import { ApiError } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { mediaUrl } from "../../utils/media";
import "../gallery/gallery.css";
import "./albums.css";

export function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const { t } = useLocale();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingMediaId, setRemovingMediaId] = useState<string | null>(null);
  const [favoriteBusyMediaId, setFavoriteBusyMediaId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const album = useAlbum(albumId);
  const media = useAlbumMedia(albumId, page, pageSize, album.isSuccess);
  const invalidate = useInvalidateAlbums();
  const total = media.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isOwner = Boolean(album.data && me && album.data.owner.id === me.id);

  useEffect(() => {
    if (media.isSuccess && !media.isPlaceholderData && page > totalPages) setPage(totalPages);
  }, [page, media.isSuccess, media.isPlaceholderData, totalPages]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [page, pageSize]);

  const removeMedia = async (mediaId: string) => {
    if (!albumId || removingMediaId) return;
    setRemovingMediaId(mediaId);
    try {
      await albumService.removeMedia(albumId, mediaId);
      await invalidate();
    } catch (err) {
      showToast.error(t("Could not remove this media item."), err instanceof ApiError ? err.message : undefined);
    } finally {
      setRemovingMediaId(null);
    }
  };

  const toggleFavorite = async (mediaId: string, isFavorited: boolean) => {
    if (favoriteBusyMediaId !== null) return;
    setFavoriteBusyMediaId(mediaId);
    try {
      if (isFavorited) await mediaService.unfavorite(mediaId);
      else await mediaService.favorite(mediaId);
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await invalidate();
    } catch (err) {
      showToast.error(err instanceof ApiError ? err.message : t("Could not update favorites."));
    } finally {
      setFavoriteBusyMediaId(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast.success(t("Link copied"));
    } catch {
      showToast.error(t("Could not copy the link."));
    }
  };

  if (album.isPending) {
    return <main className="gallery-page album-page"><Spinner label={t("Loading album…")} /></main>;
  }

  if (album.isError) {
    const missing = album.error instanceof ApiError && album.error.status === 404;
    return (
      <main className="gallery-page album-page">
        <div className="gallery-page__content">
          <div className="gallery-page__inner">
            {missing ? (
              <EmptyState title="Album not found" hint="It may be private or deleted." />
            ) : (
              <ErrorState message={t("Could not load this album.")} onRetry={() => void album.refetch()} />
            )}
            <Link to="/albums" className="btn btn--secondary album-page__back">{t("Back to Albums")}</Link>
          </div>
        </div>
      </main>
    );
  }

  const data = album.data;

  return (
    <main className="gallery-page album-page" aria-label={data.name}>
      <div className="gallery-page__content" ref={contentRef}>
        <div className="gallery-page__inner">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <Link to="/albums" className="btn btn--ghost album-page__back">
              <ArrowLeft size={16} aria-hidden="true" />
              {t("Back to Albums")}
            </Link>
          </AnimateIcon>

          <header className="album-hero">
            <div className="album-hero__preview" aria-hidden="true">
              {data.previewMediaId ? <img src={mediaUrl(data.previewMediaId)} alt="" /> : null}
            </div>
            <div className="album-hero__text">
              <p className="gallery-page__eyebrow">
                {t(data.isPublic ? "Public album" : "Private album")}
                {" · "}
                {t("by {owner}", { owner: isOwner ? t("You") : data.owner.username })}
              </p>
              <h1>{data.name}<span className="brand__dot">.</span></h1>
              <p>{t("{count} media", { count: data.mediaCount })}</p>
              {isOwner || data.isPublic ? (
                <div className="album-hero__actions">
                  {data.isPublic ? (
                    <Button type="button" variant="secondary" onClick={() => void copyLink()}>
                      <Globe size={16} aria-hidden="true" />
                      {t("Copy share link")}
                    </Button>
                  ) : null}
                  {isOwner ? (
                    <>
                      <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
                        <PencilLine size={16} aria-hidden="true" />
                        {t("Edit")}
                      </Button>
                      <Button type="button" variant="ghost" className="album-hero__delete" onClick={() => setDeleting(true)}>
                        <Trash2 size={16} aria-hidden="true" />
                        {t("Delete")}
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </header>

          {media.isPending ? <Spinner label={t("Loading media…")} /> : media.isError ? (
            <ErrorState message={t("Could not load media.")} onRetry={() => void media.refetch()} />
          ) : (media.data?.items.length ?? 0) === 0 ? (
            <EmptyState title="This album is empty" hint={isOwner ? "Use Save on any image or video to add it here." : undefined} />
          ) : (
            <div className="gallery-grid" aria-busy={media.isFetching}>
              {media.data!.items.map((item) => (
                <div key={item.id} className="album-item">
                  <MediaCard
                    media={item}
                    onToggleFavorite={toggleFavorite}
                    favoriteBusy={favoriteBusyMediaId === item.id}
                    favoriteDisabled={favoriteBusyMediaId !== null}
                  />
                  {isOwner ? (
                    <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                      <button
                        type="button"
                        className="album-item__remove"
                        aria-label={t("Remove from album")}
                        title={t("Remove from album")}
                        aria-busy={removingMediaId === item.id || undefined}
                        disabled={removingMediaId !== null}
                        onClick={() => void removeMedia(item.id)}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </AnimateIcon>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {media.isSuccess && total > 0 ? (
        <footer className="gallery-page__footer">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            itemLabel="media"
            isFetching={media.isFetching}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </footer>
      ) : null}
      {editing ? (
        <AlbumFormDialog
          album={data}
          onClose={() => setEditing(false)}
          onSubmit={async (input) => {
            await albumService.update(data.id, input);
            await invalidate();
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmationDialog
          title="Delete album?"
          danger
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await albumService.remove(data.id);
            navigate("/albums", { replace: true });
            void invalidate();
          }}
        >
          {t("The album “{name}” will be deleted. Saved media stay in your gallery.", { name: data.name })}
        </ConfirmationDialog>
      ) : null}
    </main>
  );
}
