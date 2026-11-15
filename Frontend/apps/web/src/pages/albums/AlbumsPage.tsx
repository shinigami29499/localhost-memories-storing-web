import { PageActionBar } from "@/components/layout/PageActionBar";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { ConfirmationDialog, EmptyState, ErrorState, Spinner, showToast } from "@/components/ui";
import { useLocale } from "@/context/LocaleContext";
import {
  AlbumCard,
  AlbumFormDialog,
  type Album,
} from "@/features/albums";
import { useAlbumsPage } from "@/pages/albums/useAlbumsPage";
import { DayRow } from "@/pages/gallery/DayRow";
import "./albums.css";

export function AlbumsPage() {
  const { t, language } = useLocale();
  const { me, creating, setCreating, editing, setEditing, selectionMode, selectedIds, deleting, setDeleting,
    albumsQuery, sentinelRef, items, selectedAlbums, canDelete, cancelSelection, setSelected, selectionDragHandlers,
    deleteSelected, deleteEditing, updateEditing, createAlbum } = useAlbumsPage();

  const groups = new Map<string, { date: Date; items: Album[] }>();
  for (const album of items) {
    const date = new Date(album.createdAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const group = groups.get(key);
    if (group) group.items.push(album);
    else groups.set(key, { date, items: [album] });
  }
  const dateGroups = [...groups.entries()].sort(([, a], [, b]) => b.date.getTime() - a.date.getTime());
  const dateFormatter = new Intl.DateTimeFormat(language, { month: "short", day: "numeric" });

  return (
    <main className="gallery-page album-page" aria-label={t("Album")} {...selectionDragHandlers}
      onClickCapture={(event) => {
        selectionDragHandlers.onClickCapture(event);
        if (event.defaultPrevented || deleting) return;
        if (selectionMode && !(event.target instanceof Element && event.target.closest("[data-media-id], .gallery-selection-bar"))) {
          cancelSelection();
        }
      }}>
      <div className="gallery-page__fixed-layout">
          <div className="gallery-page__content gallery-page__media-scroll">
          <div className="gallery-page__tab-panel--media">
          <div className="gallery-page__content-body">
          {albumsQuery.isPending ? <Spinner page label={t("Loading albums...")} /> : albumsQuery.isError && items.length === 0 ? (
            <ErrorState message={t("Could not load albums.")} onRetry={() => void albumsQuery.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No albums yet"
              hint="Use New album to organize your media into collections."
              action={<button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>{t("New album")}</button>}
            />
          ) : (
            <div className="gallery-groups" aria-busy={albumsQuery.isFetching}>
              {dateGroups.map(([key, group]) => (
                <section key={key} aria-label={`${group.date.getFullYear()}, ${dateFormatter.format(group.date)}`}>
                  <div className="gallery-group__header">
                    <h2 className="gallery-group__title">
                      <time dateTime={`${group.date.getFullYear()}-${String(group.date.getMonth() + 1).padStart(2, "0")}-${String(group.date.getDate()).padStart(2, "0")}`}>
                        {`${group.date.getFullYear()}, ${dateFormatter.format(group.date)}`}
                      </time>
                    </h2>
                  </div>
                  <DayRow items={group.items}
                    onReachEnd={key === dateGroups[dateGroups.length - 1]?.[0] && albumsQuery.hasNextPage && !albumsQuery.isFetching && !albumsQuery.isFetchNextPageError ? () => { void albumsQuery.fetchNextPage(); } : undefined}
                    renderItem={(album) => (
                      <AlbumCard
                        album={album}
                        isOwner={album.owner.id === me?.id}
                        showOwner
                        onEdit={setEditing}
                        selectionMode={selectionMode}
                        selected={selectedIds.has(album.id)}
                        onSelect={(id) => setSelected(id, !selectedIds.has(id))}
                      />
                    )} />
                </section>
              ))}
            </div>
          )}
          {albumsQuery.isFetchNextPageError ? (
            <ErrorState message={t("Could not load more albums.")} onRetry={() => void albumsQuery.fetchNextPage()} />
          ) : null}
          {albumsQuery.isFetchingNextPage ? <Spinner label={t("Loading albums...")} /> : null}
          <div ref={sentinelRef} aria-hidden="true" />
          </div>
          </div>
          </div>
      </div>
      <footer className="gallery-page__footer albums-page__footer">
        <PageActionBar className="gallery-page__actions" role="group" aria-label={t("{count} selected", { count: selectedIds.size })}>
          <span className="gallery-selection-bar__status" role="status">{t("{count} selected", { count: selectedIds.size })}</span>
          {selectionMode && <><span className="gallery-selection-bar__count" aria-hidden="true">{t("{count} selected", { count: selectedIds.size })}</span><span className="gallery-selection-bar__divider" aria-hidden="true" /></>}
          {!selectionMode && <button key="primary" type="button" className="gallery-selection-bar__action gallery-selection-bar__action--primary" aria-label={t("New album")} title={t("New album")} disabled={deleting} onClick={() => setCreating(true)}>
            <Plus size={20} aria-hidden="true" />
            <span>{t("New album")}</span>
          </button>}
          <SelectionActions open={selectionMode} mobileVertical>
          <button type="button" className="gallery-selection-bar__action gallery-selection-bar__action--danger" aria-label={t("Delete selected albums")} title={t("Delete selected albums")}
            disabled={!canDelete || deleting} onClick={() => setDeleting(true)}><Trash2 size={20} aria-hidden="true" /><span>{t("Delete")}</span></button></SelectionActions>
        </PageActionBar>
      </footer>
      {deleting && <ConfirmationDialog title="Delete selected albums?" confirmLabel="Delete selected albums" danger onClose={() => setDeleting(false)} onConfirm={deleteSelected}>
        <p>{t("{count} selected", { count: selectedAlbums.length })}</p>
        <p>{t("Selected albums will be deleted. Saved media stay in your gallery.")}</p>
      </ConfirmationDialog>}
      {editing ? (
        <AlbumFormDialog
          album={editing}
          onClose={() => setEditing(null)}
          onDelete={deleteEditing}
          onSubmit={updateEditing}
        />
      ) : null}
      {creating ? (
        <AlbumFormDialog
          onClose={() => setCreating(false)}
          onSubmit={createAlbum}
        />
      ) : null}
    </main>
  );
}
import { SelectionActions } from "@/pages/gallery/SelectionActions";
