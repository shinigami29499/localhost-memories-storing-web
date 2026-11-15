import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Heart } from "@/components/animate-ui/icons/heart";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { Link } from "react-router-dom";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageActionButton } from "@/components/layout/PageActionButton";
import { ConfirmationDialog, EmptyState, ErrorState, Spinner } from "@/components/ui";
import { BulkSaveToAlbumDialog } from "@/features/albums/components/BulkSaveToAlbumDialog";
import { GalleryLoadingProvider } from "@/features/media/components/GalleryLoadingProvider";
import { MediaPreviewDialog } from "@/features/media/components/MediaPreviewDialog";
import { MediaRetryProvider } from "@/features/media/components/MediaRetryProvider";
import "../../../../../src/features/media/components/media.css";
import type { MediaKindFilter } from "@/features/media/types";
import { SelectionActions } from "@/pages/gallery/SelectionActions";
import { VirtualGalleryGroup } from "@/pages/gallery/VirtualGalleryGroup";

import { useGalleryPage, type GalleryView } from "@/pages/gallery/useGalleryPage";
export type { GalleryView } from "@/pages/gallery/useGalleryPage";

export function GalleryPage({ view = "pictures", initialFilter }: { view?: GalleryView; initialFilter?: MediaKindFilter }) {
  const { t, isAdmin, selectedFilter, uploading, uploadInput, selectionMode, selectedItems, selectedIds, membership, inAlbum, saveDialogOpen, setSaveDialogOpen, deleteDialogOpen, setDeleteDialogOpen, missingMedia, setMissingMedia, bulkFavoriteBusy, previewMediaId, setPreviewMediaId, setPreviewGroupKey, hasMoreBelow, galleryRef, returnToMediaId, returnToIndex, sentinelRef, showingFavorites, query, viewport, media, focusMediaId, groups, previewItems, dateFormatter, selectedMedia, allSelectedFavorited, favoriteBusy, openFavorites, uploadFiles, cancelSelection, toggleFavorite, toggleSelected, selectionDragHandlers, favoriteSelected, deleteSelected, checkUnavailable, deleteMissingMedia } = useGalleryPage({ view, initialFilter });
  const galleryContent = (
    <>
      {query.isPending ? <Spinner page label={t("Loading media...")} /> : null}
      {query.isError && media.length === 0 ? (
        <ErrorState message={t("Could not load media.")} onRetry={() => void query.refetch()} />
      ) : null}
      {!query.isPending && !query.isError && media.length === 0 ? (
        <EmptyState
          title={view === "favorites"
            ? selectedFilter === "video"
              ? "No favorite videos yet"
              : selectedFilter === "image"
                ? "No favorite images yet"
                : "No favorites yet"
            : selectedFilter === "video"
              ? "No videos yet"
              : selectedFilter === "image"
                ? "No images yet."
                : "No media yet"}
          hint={view === "favorites"
            ? "Tap the heart on an image or video to add it here."
            : selectedFilter === "video"
              ? "Videos added to your library will appear here."
              : selectedFilter === "image"
                ? "Images added to your library will appear here."
                : "Uploaded images and videos will appear here."}
          action={view === "favorites" ? <Link className="btn btn--secondary" to="/gallery">{t("Browse gallery")}</Link> : undefined}
        />
      ) : null}
      {media.length > 0 ? (
        <div className="gallery-groups" aria-busy={query.isFetching}>
          <MediaRetryProvider key={`${view}-${selectedFilter}`} order={groups.flatMap(([, group]) => group.items.map((item) => item.id))}>
            {groups.map(([key, group]) => {
              const dateLabel = `${group.date.getFullYear()}, ${dateFormatter.format(group.date)}`;
              return (
              <section key={key} aria-label={dateLabel} data-gallery-row>
                <div className="gallery-group__header">
                  <h2 className="gallery-group__title">
                    <time dateTime={`${group.date.getFullYear()}-${String(group.date.getMonth() + 1).padStart(2, "0")}-${String(group.date.getDate()).padStart(2, "0")}`}>
                      {dateLabel}
                    </time>
                  </h2>
                </div>
                  <VirtualGalleryGroup items={group.items} viewport={viewport} mediaKind={selectedFilter} pinnedId={focusMediaId}
                    selectionMode={selectionMode} selectedItems={selectedItems} onSelect={toggleSelected}
                    onFavorite={(mediaId) => void toggleFavorite(mediaId, false)} favoriteBusy={favoriteBusy} onOpen={(id) => { setPreviewGroupKey(key); setPreviewMediaId(id); }}
                    onUnavailable={isAdmin ? checkUnavailable : undefined}
                    onReachEnd={key === groups[groups.length - 1]?.[0] && query.hasNextPage && !query.isFetching && !query.isFetchNextPageError ? () => { void query.fetchNextPage({ cancelRefetch: false }); } : undefined} />
              </section>
              );
            })}
          </MediaRetryProvider>
        </div>
      ) : null}

      {query.isFetchNextPageError && media.length > 0 && !previewMediaId ? (
        <ErrorState message={t("Could not load more media.")} onRetry={() => void query.fetchNextPage()} />
      ) : null}
      {query.isFetchingNextPage ? <Spinner label={t("Loading more media...")} /> : null}
      <div ref={sentinelRef} aria-hidden="true" />
      {query.isError && !query.isFetchNextPageError && media.length > 0 ? (
        <ErrorState message={t("Could not refresh media.")} onRetry={() => void query.refetch()} />
      ) : null}
      {membership.isError ? (
        <ErrorState
          message={t("Could not load albums.")}
          onRetry={() => void membership.refetch()}
        />
      ) : null}
    </>
  );

  return (
    <main ref={galleryRef} tabIndex={-1} className="gallery-page" {...selectionDragHandlers}
      onClickCapture={(event) => {
        selectionDragHandlers.onClickCapture(event);
        if (event.defaultPrevented) return;
        if (saveDialogOpen || deleteDialogOpen || missingMedia) return;
        if (!selectionMode || (event.target instanceof Element && event.target.closest("[data-media-id], .gallery-selection-bar"))) return;
        cancelSelection();
      }}>
      <GalleryLoadingProvider containerRef={galleryRef}>
        <div className="gallery-page__fixed-layout">
          <div className="gallery-page__fixed-tabs">
            <div className="gallery-page__content gallery-page__media-scroll">
              <div className="gallery-page__tab-panel gallery-page__tab-panel--media">{galleryContent}</div>
            </div>
          </div>
          <div className="gallery-page__scroll-cue gallery-page__scroll-cue--down" aria-hidden="true" data-visible={hasMoreBelow || undefined} />
        </div>
      </GalleryLoadingProvider>

          <PageActionBar className="gallery-page__actions" role="group" aria-label={t("{count} selected", { count: selectedItems.size })} aria-busy={bulkFavoriteBusy}>
            <span className="gallery-selection-bar__status" role="status">{t("{count} selected", { count: selectedItems.size })}</span>
          {selectionMode && <><span className="gallery-selection-bar__count" aria-hidden="true">{t("{count} selected", { count: selectedItems.size })}</span><span className="gallery-selection-bar__divider" aria-hidden="true" /></>}
            <input ref={uploadInput} type="file" accept="image/*,video/*" multiple hidden onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
              void uploadFiles(files);
            }} />
              {!selectionMode && <PageActionButton key="primary" aria-label={t("Upload media")} title={t("Upload media")}
                className="gallery-selection-bar__action--primary"
                disabled={uploading || bulkFavoriteBusy} aria-busy={uploading || undefined} onClick={() => uploadInput.current?.click()}>
                {uploading ? <LoaderCircle size={20} className="spinner__wheel" aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
                <span>{t("Upload media")}</span>
              </PageActionButton>}
            {selectionMode ? (
              <PageActionButton
                key="favorite"
                type="button"
                className="gallery-selection-bar__action--favorite"
                aria-label={t(allSelectedFavorited ? "Remove from favorites" : "Add to favorites")}
                title={t(allSelectedFavorited ? "Remove from favorites" : "Add to favorites")}
                aria-pressed={allSelectedFavorited}
                aria-busy={bulkFavoriteBusy || undefined}
                disabled={favoriteBusy || selectedMedia.length === 0}
                onClick={() => void favoriteSelected()}
              >
                {bulkFavoriteBusy
                  ? <LoaderCircle size={20} className="spinner__wheel" aria-hidden="true" />
                  : <Heart size={20} fill={allSelectedFavorited ? "currentColor" : "none"} aria-hidden="true" />}
              </PageActionButton>
            ) : (
              <Link
                key="favorite"
                className={`gallery-selection-bar__action${showingFavorites ? " gallery-selection-bar__action--favorite-active" : ""}`}
                to={showingFavorites ? "/gallery" : "/gallery/favorites"}
                onClick={(event) => void openFavorites(event)}
                aria-label={t(showingFavorites ? "Gallery" : "Favorites")}
                title={t(showingFavorites ? "Gallery" : "Favorites")}
              >
                <Heart size={20} fill={showingFavorites ? "currentColor" : "none"} aria-hidden="true" />
              </Link>
            )}
            <SelectionActions open={selectionMode} mobileVertical>
                <PageActionButton
                  type="button"
                  className="gallery-selection-bar__action--save"
                  aria-label={t("Save to album")}
                  title={t("Save to album")}
                  aria-pressed={inAlbum}
                  aria-busy={membership.isPending || undefined}
                  disabled={favoriteBusy || selectedMedia.length === 0}
                  onClick={() => setSaveDialogOpen(true)}
                >
                  <Bookmark
                    size={20}
                    fill={inAlbum ? "currentColor" : "none"}
                    style={{ color: inAlbum ? "var(--bookmark-active)" : "inherit" }}
                    aria-hidden="true"
                  />
                </PageActionButton>
              <PageActionButton
                type="button"
                className="gallery-selection-bar__action--danger"
                aria-label={t("Move to trash")}
                title={t("Move to trash")}
                disabled={favoriteBusy || selectedMedia.length === 0}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 size={20} aria-hidden="true" />
                <span>{t("Trash")}</span>
              </PageActionButton>
            </SelectionActions>
          </PageActionBar>

      {saveDialogOpen ? (
        <BulkSaveToAlbumDialog
          mediaIds={selectedIds}
          onClose={() => setSaveDialogOpen(false)}
        />
      ) : null}
      {deleteDialogOpen ? (
        <ConfirmationDialog
          title="Move selected media to trash?"
          confirmLabel="Move to trash"
          danger
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={deleteSelected}
        >
          <p>{t("{count} selected", { count: selectedIds.length })}</p>
          {t("Selected media will move to trash and can be restored later.")}
        </ConfirmationDialog>
      ) : null}
      {missingMedia ? (
        <ConfirmationDialog
          title="Permanently delete missing media records?"
          confirmLabel="Delete records"
          danger
          onClose={() => setMissingMedia(null)}
          onConfirm={deleteMissingMedia}
        >
          <p>{t("{count} selected", { count: missingMedia.length })}</p>
          <ul>{missingMedia.map((item) => <li key={item.id}>{item.originalFilename}</li>)}</ul>
          {t("Permanently delete these library records and their album and place links? No files will be searched for, moved, or deleted. This cannot be undone.")}
        </ConfirmationDialog>
      ) : null}
      {previewMediaId ? (
        <MediaPreviewDialog
          key={previewMediaId}
          media={previewItems}
          initialMediaId={previewMediaId}
          favoriteBusy={favoriteBusy}
          onToggleFavorite={(mediaId, isFavorited) => void toggleFavorite(mediaId, isFavorited)}
          onClose={(mediaId) => {
            returnToIndex.current = Math.max(0, media.findIndex((item) => item.id === mediaId));
            returnToMediaId.current = mediaId;
            setPreviewMediaId(null);
          }}
        />
      ) : null}
    </main>
  );
}
