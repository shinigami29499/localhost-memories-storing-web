import { startTransition, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as Tabs from "@radix-ui/react-tabs";
import { Highlight, HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { AnimateIcon, AnimatedAction, useAnimateIconOnChange } from "@/components/animate-ui/icons/icon";
import { ScrollProgress, ScrollProgressContainer, ScrollProgressProvider } from "@animate-ui/react/primitives/scroll-progress";
import { ScrollFade } from "@animate-ui/react/primitives/effects/scroll-fade";
import { ExternalLink } from "@/components/animate-ui/icons/external-link";
import { Check } from "@/components/animate-ui/icons/check";
import { CopyButton, CopyButtonIcon } from "@animate-ui/react/primitives/buttons/copy";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { NotebookPen } from "@/components/animate-ui/icons/notebook-pen";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Heart } from "@/components/animate-ui/icons/heart";
import { Button, ConfirmationDialog, EmptyState, ErrorState, Spinner, showToast } from "../../components/ui";
import { PageTransition } from "../../components/layout/PageTransition";
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
import { MediaRetryProvider } from "../../features/media/components/MediaRetryProvider";
import { MediaPreviewDialog } from "../../features/media/components/MediaPreviewDialog";
import { useMediaSelectionDrag } from "../../features/media/hooks/useMediaSelectionDrag";
import { DownloadButton } from "../../features/downloads/components/DownloadButton";
import type { MediaFile, MediaKindFilter } from "../../features/media/types";
import { mediaService } from "../../features/media/services/mediaService";
import "../../features/media/components/media.css";
import { ApiError } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { mediaPreviewUrl } from "../../utils/media";
import { readPageTransitionEffect } from "../../utils/pageTransition";
import "../gallery/gallery.css";
import "./albums.css";

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
  const { t, language } = useLocale();
  const pageTransition = readPageTransitionEffect();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const selectionAnimationRevision = useAnimateIconOnChange(selectionMode);
  const [selectedItems, setSelectedItems] = useState<Map<string, MediaFile>>(() => new Map());
  const [removingSelection, setRemovingSelection] = useState(false);
  const [bulkFavoriteBusy, setBulkFavoriteBusy] = useState(false);
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
  const selectedMedia = [...selectedItems.values()];
  const allSelectedFavorited = selectedMedia.length > 0 && selectedMedia.every((item) => item.isFavorited);
  const groups = new Map<string, { date: Date; items: MediaFile[] }>();
  for (const item of items) {
    const date = new Date(item.createdAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const group = groups.get(key);
    if (group) group.items.push(item); else groups.set(key, { date, items: [item] });
  }
  const dateGroups = [...groups.entries()].sort(([, a], [, b]) => b.date.getTime() - a.date.getTime());
  const dateFormatter = new Intl.DateTimeFormat(language, { year: "numeric", month: "long", day: "numeric" });
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
  }, [mediaKind]);

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
        queryClient.setQueryData(albumKeys.detail(albumId ?? ""), (current) => current?.previewMediaId && changedIds.has(current.previewMediaId)
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
    <main className="gallery-page album-page" aria-label={data.name} {...selectionDragHandlers}
      onClickCapture={(event) => {
        selectionDragHandlers.onClickCapture(event);
        if (event.defaultPrevented) return;
        if (selectionMode && !(event.target instanceof Element && event.target.closest("[data-media-id], .gallery-selection-bar"))) {
          cancelSelection();
        }
      }}>
      <ScrollProgressProvider>
        <div className="gallery-page__scroll-track" aria-hidden="true">
          <ScrollProgress mode="scaleX" className="gallery-page__scroll-progress" />
        </div>
        <div className="gallery-page__fixed-layout">
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
              {!editingCaption && data.caption ? <p className="album-hero__caption">{data.caption}</p> : null}
            </div>
            {editingCaption ? (
              <AlbumCaptionDialog caption={data.caption} onSave={saveCaption} onClose={() => setEditingCaption(false)} />
            ) : null}
            {isOwner || data.isPublic ? (
              <div className="album-hero__actions">
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
                      className="album-hero__icon-button album-hero__delete"
                      aria-label={t("Delete")}
                      title={t("Delete")}
                      onClick={() => setDeleting(true)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
          </header>
          <Tabs.Root
            className="gallery-page__fixed-tabs"
            value={mediaKind}
            onValueChange={(value) => {
              if (value !== "image" && value !== "video") return;
              startTransition(() => setMediaKind(value));
            }}
          >
            <div className="gallery-page__media-toolbar">
              <Tabs.List className="gallery-page__media-filters" aria-label={t("Filter by media type")}>
                <Highlight value={mediaKind} controlledItems className="gallery-page__media-highlight">
                  <HighlightItem value="image" asChild><Tabs.Trigger className="gallery-page__media-option" value="image" disabled={bulkFavoriteBusy}>{t("Images")}</Tabs.Trigger></HighlightItem>
                  <HighlightItem value="video" asChild><Tabs.Trigger className="gallery-page__media-option" value="video" disabled={bulkFavoriteBusy}>{t("Videos")}</Tabs.Trigger></HighlightItem>
                </Highlight>
              </Tabs.List>
            </div>
            <ScrollFade asChild blur={0} shrink={0}>
            <ScrollProgressContainer className="gallery-page__content gallery-page__media-scroll" ref={contentRef}>
            <Tabs.Content value={mediaKind} className="gallery-page__tab-panel gallery-page__tab-panel--media">
              <PageTransition effect={pageTransition} transitionKey={mediaKind}>
              {media.isPending ? <Spinner label={t("Loading media…")} /> : media.isError && items.length === 0 ? (
                <ErrorState message={t("Could not load media.")} onRetry={() => void media.refetch()} />
              ) : items.length === 0 ? (
                <EmptyState
                  title={mediaKind === "video" ? "No videos in this album" : "No images in this album"}
                  hint={mediaKind === "video"
                    ? "Videos added to this album will appear here."
                    : "Images added to this album will appear here."}
                />
              ) : (
                <MediaRetryProvider key={mediaKind} order={dateGroups.flatMap(([, group]) => group.items.map((item) => item.id))}>
                  <div className="gallery-groups" aria-busy={media.isFetching}>
                    {dateGroups.map(([key, group]) => (
                      <section key={key} aria-label={dateFormatter.format(group.date)}>
                        <div className="gallery-group__header"><h2 className="gallery-group__title">
                          <time dateTime={`${group.date.getFullYear()}-${String(group.date.getMonth() + 1).padStart(2, "0")}-${String(group.date.getDate()).padStart(2, "0")}`}>{dateFormatter.format(group.date)}</time>
                        </h2></div>
                        <div className="gallery-date-grid" data-media-kind={mediaKind}>
                        {group.items.map((item) => (
                        <MediaTile
                          key={item.id}
                          media={item}
                          selectionMode={selectionMode}
                          selectionDragEnabled
                          selected={selectedItems.has(item.id)}
                          onSelect={(id) => setSelected(id, !selectedItems.has(id))}
                          onOpen={setPreviewMediaId}
                          onFavorite={(mediaId) => void toggleFavorite(mediaId, false)}
                          favoriteDisabled={favoriteBusyMediaId !== null || bulkFavoriteBusy}
                        />
                        ))}
                        </div>
                      </section>
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
              </PageTransition>
            </Tabs.Content>
            </ScrollProgressContainer>
            </ScrollFade>
          </Tabs.Root>
        </div>
      </ScrollProgressProvider>
      <footer className="gallery-page__footer gallery-page__footer--transition">
        <div className="gallery-selection-bar gallery-selection-bar--compact" role="group" aria-label={t("{count} selected", { count: selectedItems.size })}>
          <span className="gallery-selection-bar__status" role="status">{t("{count} selected", { count: selectedItems.size })}</span>
          <DownloadButton media={selectedMedia} className="gallery-selection-bar__action gallery-selection-bar__action--download" disabled={bulkFavoriteBusy} animationMode={selectionMode} />
          <AnimatedAction animationRevision={selectionAnimationRevision}><button type="button" className="gallery-selection-bar__action gallery-selection-bar__action--favorite"
            aria-label={t(allSelectedFavorited ? "Remove from favorites" : "Add to favorites")} title={t(allSelectedFavorited ? "Remove from favorites" : "Add to favorites")}
            aria-pressed={allSelectedFavorited} disabled={!selectedMedia.length || bulkFavoriteBusy || favoriteBusyMediaId !== null} onClick={() => void favoriteSelected()}>
            <Heart size={20} fill={allSelectedFavorited ? "currentColor" : "none"} aria-hidden="true" />
          </button></AnimatedAction>
          {isOwner && <AnimatedAction animationRevision={selectionAnimationRevision}><button type="button" className="gallery-selection-bar__action gallery-selection-bar__action--danger"
            aria-label={t("Remove from album")} title={t("Remove from album")} disabled={!selectedMedia.length || bulkFavoriteBusy}
            onClick={() => setRemovingSelection(true)}><Trash2 size={20} aria-hidden="true" /></button></AnimatedAction>}
        </div>
      </footer>
      {removingSelection && <ConfirmationDialog title="Remove selected media from album?" danger onConfirm={removeSelected} onClose={() => setRemovingSelection(false)}>
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
            return () => {
              navigate("/library/album", { replace: true });
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
