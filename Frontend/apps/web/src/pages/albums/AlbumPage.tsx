import { PageDataPlaceholder } from "@/components/ui/PageDataPlaceholder";
import { Check } from "@/components/animate-ui/icons/check";
import { ExternalLink } from "@/components/animate-ui/icons/external-link";
import { Heart } from "@/components/animate-ui/icons/heart";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { ImageIcon } from "@/components/animate-ui/icons/image";
import { NotebookPen } from "@/components/animate-ui/icons/notebook-pen";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { VideoIcon } from "@/components/animate-ui/icons/video";
import { CopyButton, CopyButtonIcon } from "@animate-ui/react/primitives/buttons/copy";
import { useParams } from "react-router-dom";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { Button, ConfirmationDialog, EmptyState, ErrorState, Spinner } from "@/components/ui";
import {
AlbumCaptionDialog,
AlbumFormDialog,
albumService
} from "@/features/albums";
import "../../../../../src/features/media/components/media.css";
import { MediaPreviewDialog } from "@/features/media/components/MediaPreviewDialog";
import { MediaRetryProvider } from "@/features/media/components/MediaRetryProvider";
import { MediaTile } from "@/features/media/components/MediaTile";
import { ApiError } from "@/services/api";
import { AlbumCaption } from "@/pages/albums/AlbumCaption";
import "./albums.css";

import { SelectionActions } from "@/pages/gallery/SelectionActions";
import { useAlbumDetail } from "@/pages/albums/useAlbumDetail";

export function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  return <AlbumDetail key={albumId} albumId={albumId} />;
}

function AlbumDetail({ albumId }: { albumId: string | undefined }) {
  const { t, navigate, copied, editing, setEditing, editingCaption, setEditingCaption, deleting, setDeleting, selectionMode, selectedItems, removingSelection, setRemovingSelection, bulkFavoriteBusy, favoriteBusyMediaId, showImages, showVideos, mediaKind, hasMediaFilter, previewMediaId, setPreviewMediaId, returnToMediaId, returnToIndex, contentRef, sentinelRef, album, media, invalidate, items, total, isOwner, selectedMedia, allSelectedFavorited, cancelSelection, setSelected, selectionDragHandlers, changeFilter, removeSelected, canUpload, uploadInput, uploadFiles, favoriteSelected, toggleFavorite, copyLink, saveCaption } = useAlbumDetail(albumId);
  if (album.isPending) {
    return <main className="gallery-page album-page mobile-content-placeholder--album-detail"><PageDataPlaceholder layout="cards" count={1} label={t("Loading album...")} /><PageDataPlaceholder layout="media" label={t("Loading media...")} /></main>;
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
        if (event.defaultPrevented || removingSelection || editing || editingCaption || deleting || previewMediaId) return;
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
              ) : media.isPending ? <PageDataPlaceholder layout="media" label={t("Loading media...")} /> : media.isError && items.length === 0 ? (
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
      {canUpload && <input ref={uploadInput} type="file" accept="image/*,video/*" multiple hidden onChange={(event) => {
        const files = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = "";
        void uploadFiles(files);
      }} />}
      <footer className="gallery-page__footer gallery-page__footer--transition">
        <PageActionBar className={canUpload ? "gallery-page__actions" : "gallery-page__actions gallery-selection-bar--selection-only"} role="group"
          aria-label={selectionMode ? t("{count} selected", { count: selectedItems.size }) : t("Album actions")}>
          <span className="gallery-selection-bar__status" role="status">{t("{count} selected", { count: selectedItems.size })}</span>
          {selectionMode && <><span className="gallery-selection-bar__count" aria-hidden="true">{t("{count} selected", { count: selectedItems.size })}</span><span className="gallery-selection-bar__divider" aria-hidden="true" /></>}
          {canUpload && !selectionMode && <button key="primary" type="button"
            className="gallery-selection-bar__action gallery-selection-bar__action--primary"
            aria-label={t("Add media")} title={t("Add media")}
            onClick={() => uploadInput.current?.click()}>
            <Plus size={20} aria-hidden="true" /><span>{t("Add media")}</span>
          </button>}
          <SelectionActions open={selectionMode} mobileVertical>
          <button type="button" className="gallery-selection-bar__action gallery-selection-bar__action--favorite"
            aria-label={t(allSelectedFavorited ? "Remove from favorites" : "Add to favorites")} title={t(allSelectedFavorited ? "Remove from favorites" : "Add to favorites")}
            aria-pressed={allSelectedFavorited} disabled={!selectedMedia.length || bulkFavoriteBusy || favoriteBusyMediaId !== null} onClick={() => void favoriteSelected()}>
            <Heart size={20} fill={allSelectedFavorited ? "currentColor" : "none"} aria-hidden="true" />
          </button>
          {isOwner && <button type="button" className="gallery-selection-bar__action gallery-selection-bar__action--danger"
            aria-label={t("Delete from album")} title={t("Delete from album")} disabled={!selectedMedia.length || bulkFavoriteBusy}
            onClick={() => setRemovingSelection(true)}><Trash2 size={20} aria-hidden="true" /><span>{t("Delete from album")}</span></button>}</SelectionActions>
        </PageActionBar>
      </footer>
      {removingSelection && <ConfirmationDialog title="Delete selected media from album?" confirmLabel="Delete from album" danger onConfirm={removeSelected} onClose={() => setRemovingSelection(false)}>
        <p>{t("{count} selected", { count: selectedMedia.length })}</p>
        <p>{data.name}</p>
        <p>{t("Files owned by the album owner will be permanently deleted from storage and every album. Other files are removed from this album.")}</p>
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
            return () => { navigate("/album", { replace: true }); void invalidate(true); };
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
              navigate("/album", { replace: true });
              void invalidate(true);
            };
          }}
        >
          {t("The album “{name}” will be deleted. Files owned by the album owner will be permanently deleted from storage and every album.", { name: data.name })}
        </ConfirmationDialog>
      ) : null}
    </main>
  );
}
