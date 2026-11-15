import { RotateCcw } from "@/components/animate-ui/icons/rotate-ccw";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { MediaPreviewDialog } from "@/features/media/components/MediaPreviewDialog";
import { MediaRetryProvider } from "@/features/media/components/MediaRetryProvider";
import "../../../../../src/features/media/components/media.css";
import { VirtualGalleryGroup } from "@/pages/gallery/VirtualGalleryGroup";

import { SelectionActions } from "@/pages/gallery/SelectionActions";
import { useTrashPage } from "@/pages/gallery/useTrashPage";

export function TrashPage() {
  const { t, filter, previewMediaId, setPreviewMediaId, setPreviewGroupKey, selectionMode, selectedIds, action, galleryRef, viewport, returnToMediaId, returnToIndex, focusAnnouncement, sentinelRef, query, media, focusMediaId, groups, previewItems, dateFormatter, cancelSelection, toggleSelected, selectionDragHandlers, requestAction, confirmAction, cancelAction } = useTrashPage();
  return (
    <>
      <main ref={galleryRef} tabIndex={-1} className={`gallery-page gallery-page--trash${selectionMode ? " gallery-page--selecting" : ""}`} {...selectionDragHandlers}
        onClickCapture={(event) => {
          selectionDragHandlers.onClickCapture(event);
          if (event.defaultPrevented) return;
          if (!selectionMode || (event.target instanceof Element && event.target.closest("[data-media-id], .gallery-selection-bar"))) return;
          cancelSelection();
        }}>
        <span className="sr-only" role="status" aria-live="polite">{focusAnnouncement}</span>
        <div className="gallery-page__content">
          <div className="gallery-page__inner">
            <div className="gallery-page__tab-panel gallery-page__tab-panel--media">
                <div className="gallery-page__content-body">
                  {query.isLoading ? <Spinner page label={t("Loading media...")} /> : null}
                  {query.isError && media.length === 0 ? (
                    <ErrorState message={t("Could not load media.")} onRetry={() => void query.refetch()} />
                  ) : null}
                  {!query.isLoading && !query.isError && media.length === 0 ? (
                    <EmptyState
                      title="Trash is empty"
                      hint="Deleted media will appear here until restored or permanently deleted."
                    />
                  ) : null}

                  {media.length > 0 ? (
                    <MediaRetryProvider key={filter} order={groups.flatMap(([, group]) => group.items.map((item) => item.id))}>
                      <div className="gallery-groups">
                        {groups.map(([key, group]) => (
                          <section key={key} aria-label={dateFormatter.format(group.date)}>
                            <div className="gallery-group__header">
                              <h2 className="gallery-group__title">
                                <time dateTime={`${group.date.getFullYear()}-${String(group.date.getMonth() + 1).padStart(2, "0")}-${String(group.date.getDate()).padStart(2, "0")}`}>
                                  {dateFormatter.format(group.date)}
                                </time>
                              </h2>
                            </div>
                            <VirtualGalleryGroup items={group.items} viewport={viewport} mediaKind={filter}
                              includeDeleted selectionMode={selectionMode} selectedItems={selectedIds}
                              onSelect={toggleSelected} onOpen={(id) => { setPreviewGroupKey(key); setPreviewMediaId(id); }} favoriteBusy={false}
                              pinnedId={focusMediaId}
                    onReachEnd={key === groups[groups.length - 1]?.[0] && query.hasNextPage && !query.isFetching && !query.isFetchNextPageError ? () => { void query.fetchNextPage(); } : undefined} />
                          </section>
                        ))}
                      </div>
                    </MediaRetryProvider>
                  ) : null}
                  {query.isFetchNextPageError && media.length > 0 && !previewMediaId ? (
                    <ErrorState message={t("Could not load more media.")} onRetry={() => void query.fetchNextPage()} />
                  ) : null}
                  {query.isFetchingNextPage ? <Spinner label={t("Loading more media...")} /> : null}
                  {query.isError && !query.isFetchNextPageError && media.length > 0 ? (
                    <ErrorState message={t("Could not refresh media.")} onRetry={() => void query.refetch()} />
                  ) : null}
                  <div ref={sentinelRef} aria-hidden="true" />
                </div>
              </div>
            
          </div>
        </div>
          <footer className="gallery-page__footer">
            <PageActionBar className="gallery-page__actions gallery-selection-bar--selection-only gallery-selection-bar--trash" role="group" aria-label={t("{count} selected", { count: selectedIds.size })}>
              <span className="gallery-selection-bar__status" role="status">{t("{count} selected", { count: selectedIds.size })}</span>
              <SelectionActions open={selectionMode} mobileVertical>
              <span className="gallery-selection-bar__count" aria-hidden="true">{t("{count} selected", { count: selectedIds.size })}</span>
              <span className="gallery-selection-bar__divider" aria-hidden="true" />
              
              <button
                type="button"
                className="gallery-selection-bar__action"
                aria-label={t("Restore")}
                title={t("Restore")}
                disabled={selectedIds.size === 0}
                onClick={() => requestAction("restore", [...selectedIds])}
              >
                <RotateCcw size={20} aria-hidden="true" />
                <span>{t("Restore")}</span>
              </button>
              <button
                type="button"
                className="gallery-selection-bar__action gallery-selection-bar__action--danger"
                aria-label={t("Permanently delete")}
                title={t("Permanently delete")}
                disabled={selectedIds.size === 0}
                onClick={() => requestAction("delete", [...selectedIds])}
              >
                <Trash2 size={20} aria-hidden="true" />
                <span>{t("Permanently delete")}</span>
              </button>
              </SelectionActions>
            </PageActionBar>
          </footer>
      </main>
      {previewMediaId ? (
        <MediaPreviewDialog
          key={previewMediaId}
          media={previewItems}
          initialMediaId={previewMediaId}
          trashActions={{
            onRestore: (id) => requestAction("restore", [id]),
            onDelete: (id) => requestAction("delete", [id]),
          }}
          onClose={(id) => {
            returnToIndex.current = Math.max(0, media.findIndex((item) => item.id === id));
            returnToMediaId.current = id;
            setPreviewMediaId(null);
          }}
        />
      ) : null}
      {action ? (
        <ConfirmationDialog
          title={action.kind === "restore" ? "Restore media?" : "Permanently delete media?"}
          confirmLabel={action.kind === "restore" ? "Restore" : "Permanently delete"}
          danger={action.kind === "delete"}
          onClose={cancelAction}
          onConfirm={confirmAction}
        >
          <p>{t("{count} selected", { count: action.ids.length })}</p>
          {t(action.kind === "restore"
            ? "Restore the selected media to your library?"
            : "The selected media will be permanently deleted and cannot be restored.")}
        </ConfirmationDialog>
      ) : null}
    </>
  );
}