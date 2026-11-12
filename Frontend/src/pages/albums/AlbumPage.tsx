import { PageActionBar } from "../../components/layout/PageActionBar";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { ExternalLink } from "@/components/animate-ui/icons/external-link";
import { Check } from "@/components/animate-ui/icons/check";
import { CopyButton, CopyButtonIcon } from "@animate-ui/react/primitives/buttons/copy";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { NotebookPen } from "@/components/animate-ui/icons/notebook-pen";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Heart } from "@/components/animate-ui/icons/heart";
import { ImageIcon } from "@/components/animate-ui/icons/image";
import { VideoIcon } from "@/components/animate-ui/icons/video";
import { Button, ConfirmationDialog, EmptyState, ErrorState, Spinner, showToast } from "../../components/ui";
import { useLocale } from "../../context/LocaleContext";
import {
  AlbumCaptionDialog,
  AlbumFormDialog,
  albumKeys,
  albumService,
  useAlbum,
  useInfiniteAlbumMedia,
  useInvalidateAlbums,
} from "../../features/albums";
import { MediaTile } from "../../features/media/components/MediaTile";
import { resolveFocusMediaId } from "../gallery/resolveFocusMediaId";
import { MediaRetryProvider } from "../../features/media/components/MediaRetryProvider";
import { MediaPreviewDialog } from "../../features/media/components/MediaPreviewDialog";
import { useMediaSelectionDrag } from "../../features/media/hooks/useMediaSelectionDrag";
import type { MediaFile, MediaKindFilter } from "../../features/media/types";
import { mediaService } from "../../features/media/services/mediaService";
import type { Album } from "../../features/albums/types";
import "../../features/media/components/media.css";
import { ApiError } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { useAnimationStore } from "../../store/animationStore";
import "../gallery/gallery.css";
import "./albums.css";
import { AlbumCaption } from "./AlbumCaption";

export function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  return <AlbumDetail key={albumId} albumId={albumId} />;
}

function updateFavoriteData<T>(data: T, mediaIds: ReadonlySet<string>, isFavorited: boolean): T {
  if (!data || typeof data !== "object") return data;
  const value = data as { items?: MediaFile[]; pages?: { items: MediaFile[] }[] };
  const updateItems = (items: MediaFile[]) => items.map((item) => mediaIds.has(item.id)
    ? { ...item, isFavorited }
    : item);
  if (Array.isArray(value.pages)) {
    return { ...value, pages: value.pages.map((page) => ({ ...page, items: updateItems(page.items) })) } as T;
  }
  if (Array.isArray(value.items))
    return { ...value, items: updateItems(value.items) } as T;
  return data;
}

function AlbumDetail({ albumId }: { albumId: string | undefined }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const animationsEnabled = useAnimationStore((state) => state.enabled);
  const filterTransition = useRef<{ positions: Map<string, DOMRect>; copies: Map<string, HTMLElement> } | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, MediaFile>>(() => new Map());
  const [removingSelection, setRemovingSelection] = useState(false);
  const [bulkFavoriteBusy, setBulkFavoriteBusy] = useState(false);
  const [favoriteBusyMediaId, setFavoriteBusyMediaId] = useState<string | null>(null);
  const [showImages, setShowImages] = useState(true);
  const [showVideos, setShowVideos] = useState(true);
  const mediaKind: MediaKindFilter | undefined = showImages === showVideos ? undefined : showImages ? "image" : "video";
  const hasMediaFilter = showImages || showVideos;
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  const returnToMediaId = useRef<string | null>(null);
  const returnToIndex = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const album = useAlbum(albumId);

  const media = useInfiniteAlbumMedia(albumId, 20, album.isSuccess && hasMediaFilter, mediaKind);
  const invalidate = useInvalidateAlbums();
  const items = media.data?.pages.flatMap((page) => page.items) ?? [];
  useEffect(() => () => {
    filterTransition.current?.copies.forEach((copy) => copy.remove());
  }, []);

  useLayoutEffect(() => {
    const transition = filterTransition.current;
    if (!transition || (hasMediaFilter && media.isPending)) return;
    filterTransition.current = null;
    const viewport = contentRef.current?.getBoundingClientRect();
    if (!media.isError && viewport) {
      for (const cell of contentRef.current?.querySelectorAll<HTMLElement>("[data-album-media-id]") ?? []) {
        const rect = cell.getBoundingClientRect();
        if (rect.right <= viewport.left || rect.left >= viewport.right || rect.bottom <= viewport.top || rect.top >= viewport.bottom) continue;
        const id = cell.dataset.albumMediaId ?? "";
        const previous = transition.positions.get(id);
        if (!previous) {
          cell.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: "ease-out" });
          continue;
        }
        transition.copies.get(id)?.remove();
        transition.copies.delete(id);
        const x = previous.left - rect.left;
        const y = previous.top - rect.top;
        if (x || y) cell.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: "translate(0, 0)" }],
          { duration: 280, easing: "cubic-bezier(.2, .8, .2, 1)" });
      }
    }
    transition.copies.forEach((copy) => {
      copy.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: "ease-out" }).onfinish = () => copy.remove();
    });
  }, [showImages, showVideos, hasMediaFilter, media.isPending, media.isError, media.data]);

  const changeFilter = (images: boolean, videos: boolean) => {
    const kind: MediaKindFilter | undefined = images === videos ? undefined : images ? "image" : "video";
    filterTransition.current?.copies.forEach((copy) => copy.remove());
    filterTransition.current = null;
    if (animationsEnabled && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && albumId
      && (!(images || videos) || queryClient.getQueryData(albumKeys.infiniteMedia(albumId, 20, kind)))) {
      const positions = new Map<string, DOMRect>();
      const copies = new Map<string, HTMLElement>();
      const viewport = contentRef.current?.getBoundingClientRect();
      for (const cell of contentRef.current?.querySelectorAll<HTMLElement>("[data-album-media-id]") ?? []) {
        const rect = cell.getBoundingClientRect();
        if (!viewport || rect.right <= viewport.left || rect.left >= viewport.right || rect.bottom <= viewport.top || rect.top >= viewport.bottom) continue;
        const id = cell.dataset.albumMediaId ?? "";
        positions.set(id, rect);
        const copy = cell.cloneNode(true) as HTMLElement;
        copy.setAttribute("aria-hidden", "true");
        copy.inert = true;
        Object.assign(copy.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`,
          height: `${rect.height}px`, margin: "0", pointerEvents: "none", zIndex: "10" });
        document.body.appendChild(copy);
        copies.set(id, copy);
      }
      filterTransition.current = { positions, copies };
    }
    setShowImages(images);
    setShowVideos(videos);
  };
  useEffect(() => {
    if (previewMediaId || !returnToMediaId.current) return;
    if (media.isFetching && !items.some((item) => item.id === returnToMediaId.current)) return;
    const focusId = resolveFocusMediaId(items, returnToMediaId.current, returnToIndex.current);
    if (!focusId && !media.hasNextPage) {
      returnToMediaId.current = null;
      contentRef.current?.focus({ preventScroll: true });
      return;
    }
    const tile = Array.from(contentRef.current?.querySelectorAll<HTMLButtonElement>("[data-media-id]") ?? [])
      .find((element) => element.dataset.mediaId === focusId);
    if (!tile) return;
    returnToMediaId.current = null;
    tile.focus({ preventScroll: true });
    tile.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
  }, [previewMediaId, items, media.isFetching, media.hasNextPage]);
  const total = media.data?.pages[0]?.total ?? 0;
  const isOwner = Boolean(album.data && me && album.data.owner.id === me.id);
  const selectedMedia = [...selectedItems.values()];
  const allSelectedFavorited = selectedMedia.length > 0 && selectedMedia.every((item) => item.isFavorited);
  const cancelSelection = () => { setSelectionMode(false); setSelectedItems(new Map()); };
  const setSelected = (id: string, selected: boolean) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    setSelectionMode(true);
    setSelectedItems((current) => { const next = new Map(current); if (selected) next.set(id, item); else next.delete(id); return next; });
  };
  const selectionDragHandlers = useMediaSelectionDrag(!previewMediaId && !editing && !editingCaption && !deleting && !removingSelection && !bulkFavoriteBusy, selectionMode, (id) => selectedItems.has(id), setSelected);

  useEffect(() => {
    if (!selectionMode || editing || editingCaption || deleting || removingSelection || bulkFavoriteBusy || previewMediaId) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); cancelSelection(); } };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectionMode, editing, editingCaption, deleting, removingSelection, bulkFavoriteBusy, previewMediaId]);

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
    cancelSelection();
  }, [showImages, showVideos]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const removeSelected = async () => {
    if (!albumId || !isOwner) return;
    try {
      const removedIds = new Set(selectedMedia.map((item) => item.id));
      await albumService.removeMediaBatch(albumId, [...removedIds]);
      setSelectedItems((current) => new Map([...current].filter(([id]) => !removedIds.has(id))));
    } finally {
      await invalidate();
    }
  };

  const favoriteSelected = async () => {
    if (selectedMedia.length === 0) return;
    setBulkFavoriteBusy(true);
    try {
      const favorite = !allSelectedFavorited;
      const ids = selectedMedia.filter((item) => item.isFavorited !== favorite).map((item) => item.id);
      if (ids.length > 0) {
        await mediaService.setFavorites(ids, favorite);
        const changedIds = new Set(ids);
        setSelectedItems((current) => {
          const next = new Map(current);
          for (const id of changedIds) {
            const item = next.get(id);
            if (item) next.set(id, { ...item, isFavorited: favorite });
          }
          return next;
        });
        queryClient.setQueriesData({ queryKey: albumKeys.detail(albumId ?? "") }, (data: unknown) =>
          updateFavoriteData(data, changedIds, favorite));
        queryClient.setQueriesData({ queryKey: ["media"] }, (data: unknown) =>
          updateFavoriteData(data, changedIds, favorite));
        queryClient.setQueryData<Album>(albumKeys.detail(albumId ?? ""), (current) => current?.previewMediaId && changedIds.has(current.previewMediaId)
          ? { ...current, previewIsFavorited: favorite }
          : current);
      }
    } catch (error) {
      showToast.error(error instanceof ApiError ? error.message : t("Could not update favorites."));
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      setBulkFavoriteBusy(false);
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
      setCopied(true);
      showToast.success(t("Link copy success"));
    } catch {
      showToast.error(t("Could not copy the link."));
    }
  };

  const saveCaption = async (caption: string) => {
    if (!albumId) return;
    await albumService.updateCaption(albumId, caption);
    await invalidate();
  };

  if (album.isPending) {
    return <main className="gallery-page album-page"><Spinner page label={t("Loading album...")} /></main>;
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
          </div>
        </div>
      </main>
    );
  }

  const data = album.data;

  return (
    <main className="gallery-page album-page" aria-label={data.name} {...selectionDragHandlers}
      onClickCapture={(event) => {
        selectionDragHandlers.onClickCapture(event);
        if (event.defaultPrevented) return;
        if (selectionMode && !(event.target instanceof Element && event.target.closest("[data-media-id], .gallery-selection-bar"))) {
          cancelSelection();
        }
      }}>
        <div className="gallery-page__fixed-layout">
          <header className="album-hero">
            <div className="album-hero__text">
              <p className="gallery-page__eyebrow">
                {t(data.isPublic ? "Public album" : "Private album")}
                {" · "}
                {t("by {owner}", { owner: isOwner ? t("You") : data.owner.username })}
              </p>
              <h1>{data.name}<span className="brand__dot">.</span></h1>
              {!editingCaption && data.caption ? <AlbumCaption caption={data.caption} /> : null}
            </div>
            {editingCaption ? (
              <AlbumCaptionDialog caption={data.caption} onSave={saveCaption} onClose={() => setEditingCaption(false)} />
            ) : null}
              <div className="album-hero__actions">
                <Button type="button" variant="secondary" className="album-hero__icon-button album-hero__filter"
                  aria-label={t("Images")} title={t("Images")} aria-pressed={showImages} disabled={bulkFavoriteBusy}
                  onClick={() => void changeFilter(!showImages, showVideos)}>
                  <ImageIcon aria-hidden="true" />
                </Button>
                <Button type="button" variant="secondary" className="album-hero__icon-button album-hero__filter"
                  aria-label={t("Videos")} title={t("Videos")} aria-pressed={showVideos} disabled={bulkFavoriteBusy}
                  onClick={() => void changeFilter(showImages, !showVideos)}>
                  <VideoIcon aria-hidden="true" />
                </Button>
                {data.isPublic ? (
                  <AnimateIcon animateOnHover animateOnTap completeOnStop asChild>
                    <CopyButton
                      type="button"
                      content={window.location.href}
                      copied={copied}
                      className="btn btn--secondary album-hero__icon-button"
                      aria-label={t("Copy share link")}
                      title={t("Copy share link")}
                      onClick={(event) => { event.preventDefault(); void copyLink(); }}
                    >
                      <CopyButtonIcon
                        aria-hidden="true"
                        icon={<ExternalLink size={18} />}
                        copiedIcon={<Check size={18} />}
                      />
                    </CopyButton>
                  </AnimateIcon>
                ) : null}
                {isOwner ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      className="album-hero__icon-button"
                      aria-label={t("Edit caption")}
                      title={t("Edit caption")}
                      onClick={() => setEditingCaption(true)}
                    >
                      <NotebookPen size={16} aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="album-hero__icon-button album-hero__edit"
                      aria-label={t("Edit")}
                      title={t("Edit")}
                      onClick={() => setEditing(true)}
                    >
                      <PencilLine size={16} aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="album-hero__icon-button album-hero__delete btn--danger-solid"
                      aria-label={t("Delete")}
                      title={t("Delete")}
                      onClick={() => setDeleting(true)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  </>
                ) : null}
              </div>
          </header>
          <div className="gallery-page__fixed-tabs">
            <div className="gallery-page__content gallery-page__media-scroll" ref={contentRef} tabIndex={-1}>
            <div className="gallery-page__tab-panel gallery-page__tab-panel--media">
              {!hasMediaFilter || (!media.isPending && !media.isError && items.length === 0) ? (
                <EmptyState
                  animateText
                  title={!hasMediaFilter ? "Select a media type" : mediaKind === "video" ? "No videos in this album" : mediaKind === "image" ? "No images in this album" : "No media yet"}
                  hint={!hasMediaFilter ? "Choose images or videos to show media." : mediaKind === "video"
                    ? "Videos added to this album will appear here."
                    : mediaKind === "image" ? "Images added to this album will appear here." : "Images and videos added to this album will appear here."}
                />
              ) : media.isPending ? <Spinner page label={t("Loading media...")} /> : media.isError && items.length === 0 ? (
                <ErrorState message={t("Could not load media.")} onRetry={() => void media.refetch()} />
              ) : (
                <MediaRetryProvider order={items.map((item) => item.id)}>
                  <div className="gallery-date-grid album-page__grid" aria-busy={media.isFetching}>
                    {items.map((item) => (
                      <div className="gallery-window-cell" key={item.id} data-album-media-id={item.id}>
                        <MediaTile media={item} selectionMode={selectionMode} selectionDragEnabled selected={selectedItems.has(item.id)}
                          onSelect={(id) => setSelected(id, !selectedItems.has(id))} onOpen={setPreviewMediaId}
                          onFavorite={(mediaId) => void toggleFavorite(mediaId, false)}
                          favoriteDisabled={favoriteBusyMediaId !== null || bulkFavoriteBusy} />
                      </div>
                    ))}
                  </div>
                </MediaRetryProvider>
              )}
              {hasMediaFilter && media.isFetchNextPageError ? (
                <ErrorState message={t("Could not load more media.")} onRetry={() => void media.fetchNextPage()} />
              ) : hasMediaFilter && media.isFetchingNextPage ? (
                <Spinner label={t("Loading more media...")} />
              ) : null}
              {hasMediaFilter && media.hasNextPage && !media.isFetchNextPageError ? (
                <div ref={sentinelRef} className="album-page__sentinel" aria-hidden="true" />
              ) : null}
            </div>
            </div>
          </div>
        </div>
      <footer className="gallery-page__footer gallery-page__footer--transition">
        <PageActionBar className="gallery-page__actions gallery-selection-bar--selection-only" role="group" aria-label={t("{count} selected", { count: selectedItems.size })}>
          <span className="gallery-selection-bar__status" role="status">{t("{count} selected", { count: selectedItems.size })}</span>
          {selectionMode && <><span className="gallery-selection-bar__count" aria-hidden="true">{t("{count} selected", { count: selectedItems.size })}</span><span className="gallery-selection-bar__divider" aria-hidden="true" /></>}
          <SelectionActions open={selectionMode} mobileVertical>
          <button type="button" className="gallery-selection-bar__action gallery-selection-bar__action--favorite"
            aria-label={t(allSelectedFavorited ? "Remove from favorites" : "Add to favorites")} title={t(allSelectedFavorited ? "Remove from favorites" : "Add to favorites")}
            aria-pressed={allSelectedFavorited} disabled={!selectedMedia.length || bulkFavoriteBusy || favoriteBusyMediaId !== null} onClick={() => void favoriteSelected()}>
            <Heart size={20} fill={allSelectedFavorited ? "currentColor" : "none"} aria-hidden="true" />
          </button>
          {isOwner && <button type="button" className="gallery-selection-bar__action gallery-selection-bar__action--danger"
            aria-label={t("Remove from album")} title={t("Remove from album")} disabled={!selectedMedia.length || bulkFavoriteBusy}
            onClick={() => setRemovingSelection(true)}><Trash2 size={20} aria-hidden="true" /><span>{t("Remove from album")}</span></button>}</SelectionActions>
        </PageActionBar>
      </footer>
      {removingSelection && <ConfirmationDialog title="Remove selected media from album?" confirmLabel="Remove from album" danger onConfirm={removeSelected} onClose={() => setRemovingSelection(false)}>
        <p>{t("{count} selected", { count: selectedMedia.length })}</p>
        <p>{data.name}</p>
        <p>{t("Selected media will be removed from this album and remain in your gallery.")}</p>
      </ConfirmationDialog>}
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
          onClose={(id) => { returnToIndex.current = Math.max(0, items.findIndex((item) => item.id === id)); returnToMediaId.current = id; setPreviewMediaId(null); }}
        />
      ) : null}
      {editing ? (
        <AlbumFormDialog
          album={data}
          onClose={() => setEditing(false)}
          onDelete={async () => {
            await albumService.remove(data.id);
            return () => { navigate("/gallery/album", { replace: true }); void invalidate(); };
          }}
          onSubmit={async (input) => {
            await albumService.update(data.id, input);
            await invalidate();
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmationDialog
          title="Delete album?"
          confirmLabel="Delete album"
          danger
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await albumService.remove(data.id);
            return () => {
              navigate("/gallery/album", { replace: true });
              void invalidate();
            };
          }}
        >
          {t("The album “{name}” will be deleted. Saved media stay in your gallery.", { name: data.name })}
        </ConfirmationDialog>
      ) : null}
    </main>
  );
}
import { SelectionActions } from "../gallery/SelectionActions";
