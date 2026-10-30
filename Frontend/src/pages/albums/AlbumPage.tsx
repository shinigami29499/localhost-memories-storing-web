import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as Tabs from "@radix-ui/react-tabs";
import { ScrollProgress, ScrollProgressContainer, ScrollProgressProvider } from "@animate-ui/react/primitives/scroll-progress";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { ArrowLeft } from "@/components/animate-ui/icons/arrow-left";
import { Globe } from "@/components/animate-ui/icons/globe";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Button, ConfirmationDialog, EmptyState, ErrorState, Spinner, showToast } from "../../components/ui";
import { useLocale } from "../../context/LocaleContext";
import {
  AlbumFormDialog,
  albumService,
  useAlbum,
  useInfiniteAlbumMedia,
  useInvalidateAlbums,
} from "../../features/albums";
import { MediaTile } from "../../features/media/components/MediaTile";
import { MediaRetryProvider } from "../../features/media/components/MediaRetryProvider";
import { MediaPreviewDialog } from "../../features/media/components/MediaPreviewDialog";
import type { MediaKindFilter } from "../../features/media/types";
import { mediaService } from "../../features/media/services/mediaService";
import "../../features/media/components/media.css";
import { ApiError } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { mediaPreviewUrl } from "../../utils/media";
import { ALBUM_CAPTION_MAX_LENGTH } from "../../features/albums/types";
import "../gallery/gallery.css";
import "./albums.css";

const ignoreMediaSelection = () => {};

export function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  return <AlbumDetail key={albumId} albumId={albumId} />;
}

function AlbumDetail({ albumId }: { albumId: string | undefined }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingMediaId, setRemovingMediaId] = useState<string | null>(null);
  const [favoriteBusyMediaId, setFavoriteBusyMediaId] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<MediaKindFilter>("image");
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const album = useAlbum(albumId);
  const media = useInfiniteAlbumMedia(albumId, 20, album.isSuccess, mediaKind);
  const invalidate = useInvalidateAlbums();
  const items = media.data?.pages.flatMap((page) => page.items) ?? [];
  const total = media.data?.pages[0]?.total ?? 0;
  const isOwner = Boolean(album.data && me && album.data.owner.id === me.id);

  useEffect(() => {
    const root = contentRef.current;
    const sentinel = sentinelRef.current;
    if (
      previewMediaId || !root || !sentinel || !media.hasNextPage
      || media.isFetching || media.isFetchNextPageError
    ) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void media.fetchNextPage({ cancelRefetch: false });
      }
    }, { root, rootMargin: "0px 0px 400px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    previewMediaId,
    media.fetchNextPage,
    media.hasNextPage,
    media.isFetchNextPageError,
    media.isFetching,
  ]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    setPreviewMediaId(null);
  }, [mediaKind]);

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

  const saveCaption = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!albumId || savingCaption) return;
    setSavingCaption(true);
    try {
      await albumService.updateCaption(albumId, captionDraft.trim());
      await invalidate();
      setEditingCaption(false);
    } catch (err) {
      showToast.error(t("Could not update album caption."), err instanceof ApiError ? err.message : undefined);
    } finally {
      setSavingCaption(false);
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
            <Link to="/library/album" className="btn btn--secondary album-page__back">{t("Back to Albums")}</Link>
          </div>
        </div>
      </main>
    );
  }

  const data = album.data;

  return (
    <main className="gallery-page album-page" aria-label={data.name}>
      <ScrollProgressProvider>
        <div className="gallery-page__scroll-track" aria-hidden="true">
          <ScrollProgress mode="scaleX" className="gallery-page__scroll-progress" />
        </div>
        <ScrollProgressContainer className="gallery-page__content" ref={contentRef}>
        <div className="gallery-page__inner">
          <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
            <Link to="/library/album" className="btn btn--ghost album-page__back">
              <ArrowLeft size={16} aria-hidden="true" />
              {t("Back to Albums")}
            </Link>
          </AnimateIcon>

          <header className="album-hero">
            <div className="album-hero__preview" aria-hidden="true">
              {data.previewMediaId ? <img src={mediaPreviewUrl(data.previewMediaId)} alt="" /> : null}
            </div>
            <div className="album-hero__text">
              <p className="gallery-page__eyebrow">
                {t(data.isPublic ? "Public album" : "Private album")}
                {" · "}
                {t("by {owner}", { owner: isOwner ? t("You") : data.owner.username })}
              </p>
              <h1>{data.name}<span className="brand__dot">.</span></h1>
              {data.caption ? <p className="album-hero__caption">{data.caption}</p> : null}
              <p>{t("{count} media", { count: data.mediaCount })}</p>
              {isOwner || data.isPublic ? (
                <div className="album-hero__actions">
                  {data.isPublic ? (
                    <Button type="button" variant="secondary" onClick={() => void copyLink()}>
                      <Globe size={16} aria-hidden="true" />
                      {t("Copy share link")}
                    </Button>
                  ) : null}
                  {data.isPublic && !isOwner ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setCaptionDraft(data.caption);
                        setEditingCaption(true);
                      }}
                    >
                      <PencilLine size={16} aria-hidden="true" />
                      {t("Edit caption")}
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
          {editingCaption ? (
            <form className="album-caption-editor" onSubmit={(event) => void saveCaption(event)}>
              <label className="album-form__field">
                <span>{t("Album caption")}</span>
                <textarea
                  value={captionDraft}
                  onChange={(event) => setCaptionDraft(event.target.value)}
                  maxLength={ALBUM_CAPTION_MAX_LENGTH}
                  rows={3}
                  autoFocus
                  disabled={savingCaption}
                />
              </label>
              <div className="album-caption-editor__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={savingCaption}
                  onClick={() => setEditingCaption(false)}
                >
                  {t("Cancel")}
                </button>
                <Button type="submit" busy={savingCaption} disabled={savingCaption}>
                  {t("Save caption")}
                </Button>
              </div>
            </form>
          ) : null}

          <Tabs.Root
            value={mediaKind}
            onValueChange={(value) => {
              if (value !== "image" && value !== "video") return;
              setMediaKind(value);
            }}
          >
            <div className="gallery-page__toolbar">
              <Tabs.List className="gallery-page__filters album-page__tabs" aria-label={t("Filter by media type")}>
                <Tabs.Trigger className="gallery-page__filter" value="image">{t("Images")}</Tabs.Trigger>
                <Tabs.Trigger className="gallery-page__filter" value="video">{t("Videos")}</Tabs.Trigger>
              </Tabs.List>
            </div>
            <Tabs.Content value={mediaKind} className="gallery-page__tab-panel">
              {media.isPending ? <Spinner label={t("Loading media…")} /> : media.isError && items.length === 0 ? (
                <ErrorState message={t("Could not load media.")} onRetry={() => void media.refetch()} />
              ) : items.length === 0 ? (
                <EmptyState
                  title={data.mediaCount === 0 ? "This album is empty" : mediaKind === "image" ? "No images in this album" : "No videos in this album"}
                  hint={isOwner ? "Use Save on any image or video to add it here." : undefined}
                />
              ) : (
                <MediaRetryProvider key={mediaKind} order={items.map((item) => item.id)}>
                  <div
                    className="gallery-date-grid"
                    aria-busy={media.isFetching}
                  >
                    {items.map((item) => (
                      <div key={item.id} className="album-item">
                        <MediaTile
                          media={item}
                          selectionMode={false}
                          selectionEnabled={false}
                          selected={false}
                          onSelect={ignoreMediaSelection}
                          onOpen={setPreviewMediaId}
                          onFavorite={(mediaId) => void toggleFavorite(mediaId, false)}
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
                              {removingMediaId === item.id ? (
                                <LoaderCircle size={16} className="spinner__wheel" aria-hidden="true" />
                              ) : <X size={16} aria-hidden="true" />}
                            </button>
                          </AnimateIcon>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </MediaRetryProvider>
              )}
              {media.isFetchNextPageError ? (
                <ErrorState message={t("Could not load more media.")} onRetry={() => void media.fetchNextPage()} />
              ) : media.isFetchingNextPage ? (
                <Spinner label={t("Loading more media…")} />
              ) : null}
              {media.hasNextPage && !media.isFetchNextPageError ? (
                <div ref={sentinelRef} className="album-page__sentinel" aria-hidden="true" />
              ) : null}
            </Tabs.Content>
          </Tabs.Root>
        </div>
        </ScrollProgressContainer>
      </ScrollProgressProvider>
      {previewMediaId ? (
        <MediaPreviewDialog
          key={previewMediaId}
          media={items}
          initialMediaId={previewMediaId}
          total={total}
          loadingMore={media.isFetchingNextPage}
          loadMoreError={media.isFetchNextPageError}
          onLoadMore={media.hasNextPage ? () => { void media.fetchNextPage({ cancelRefetch: false }); } : undefined}
          favoriteBusy={favoriteBusyMediaId !== null}
          onToggleFavorite={(mediaId, isFavorited) => void toggleFavorite(mediaId, isFavorited)}
          onClose={() => setPreviewMediaId(null)}
        />
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
            navigate("/library/album", { replace: true });
            void invalidate();
          }}
        >
          {t("The album “{name}” will be deleted. Saved media stay in your gallery.", { name: data.name })}
        </ConfirmationDialog>
      ) : null}
    </main>
  );
}
