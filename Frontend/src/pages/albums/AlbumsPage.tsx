import { PageActionBar } from "../../components/layout/PageActionBar";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { ConfirmationDialog, EmptyState, ErrorState, Spinner, showToast } from "../../components/ui";
import { useLocale } from "../../context/LocaleContext";
import {
  AlbumCard,
  AlbumFormDialog,
  albumService,
  useInfiniteAlbums,
  useInvalidateAlbums,
  type Album,
} from "../../features/albums";
import { useAuthStore } from "../../store/authStore";
import { useMediaSelectionDrag } from "../../features/media/hooks/useMediaSelectionDrag";
import "../gallery/gallery.css";
import "./albums.css";

export function AlbumsPage() {
  const { t, language } = useLocale();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Album | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const albumsQuery = useInfiniteAlbums("feed");
  const invalidate = useInvalidateAlbums();
  const items = albumsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedAlbums = items.filter((album) => selectedIds.has(album.id));
  const canDelete = selectedAlbums.length > 0 && selectedAlbums.every((album) => album.owner.id === me?.id);
  const cancelSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };
  const setSelected = (id: string, selected: boolean) => {
    setSelectionMode(true);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(id); else next.delete(id);
      return next;
    });
  };
  const selectionDragHandlers = useMediaSelectionDrag(!creating && !editing && !deleting, selectionMode, (id) => selectedIds.has(id), setSelected);
  useEffect(() => {
    if (!selectionMode || deleting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); cancelSelection(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectionMode, deleting]);

  const groups = new Map<string, { date: Date; items: Album[] }>();
  for (const album of items) {
    const date = new Date(album.createdAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const group = groups.get(key);
    if (group) group.items.push(album);
    else groups.set(key, { date, items: [album] });
  }
  const dateGroups = [...groups.entries()].sort(([, a], [, b]) => b.date.getTime() - a.date.getTime());
  const dateFormatter = new Intl.DateTimeFormat(language, { year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="gallery-page album-page" aria-label={t("Album")} {...selectionDragHandlers}
      onClickCapture={(event) => {
        selectionDragHandlers.onClickCapture(event);
        if (event.defaultPrevented) return;
        if (selectionMode && !(event.target instanceof Element && event.target.closest("[data-media-id], .gallery-selection-bar"))) {
          cancelSelection();
        }
      }}>
      <div className="gallery-page__fixed-layout">
          <div className="gallery-page__content gallery-page__media-scroll">
          <div className="gallery-page__tab-panel--media">
          <div className="gallery-page__content-body">
          {albumsQuery.isPending ? <Spinner label={t("Loading albums…")} /> : albumsQuery.isError && items.length === 0 ? (
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
                <section key={key} aria-label={dateFormatter.format(group.date)}>
                  <div className="gallery-group__header">
                    <h2 className="gallery-group__title">
                      <time dateTime={`${group.date.getFullYear()}-${String(group.date.getMonth() + 1).padStart(2, "0")}-${String(group.date.getDate()).padStart(2, "0")}`}>
                        {dateFormatter.format(group.date)}
                      </time>
                    </h2>
                  </div>
                  <div className="album-grid">
                    {group.items.map((album) => (
                      <AlbumCard
                        key={album.id}
                        album={album}
                        isOwner={album.owner.id === me?.id}
                        showOwner
                        onEdit={setEditing}
                        selectionMode={selectionMode}
                        selected={selectedIds.has(album.id)}
                        onSelect={(id) => setSelected(id, !selectedIds.has(id))}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {albumsQuery.isFetchNextPageError ? (
            <ErrorState message={t("Could not load more albums.")} onRetry={() => void albumsQuery.fetchNextPage()} />
          ) : null}
          {albumsQuery.hasNextPage ? (
            <button type="button" className="btn btn--secondary" disabled={albumsQuery.isFetchingNextPage}
              onClick={() => void albumsQuery.fetchNextPage()}>
              {t(albumsQuery.isFetchingNextPage ? "Loading albums…" : "Load more")}
            </button>
          ) : null}
          </div>
          </div>
          </div>
      </div>
      <footer className="gallery-page__footer albums-page__footer">
        <PageActionBar className="gallery-page__actions" role="group" aria-label={t("{count} selected", { count: selectedIds.size })}>
          <span className="gallery-selection-bar__status" role="status">{t("{count} selected", { count: selectedIds.size })}</span>
          {selectionMode && <><span className="gallery-selection-bar__count" aria-hidden="true">{t("{count} selected", { count: selectedIds.size })}</span><span className="gallery-selection-bar__divider" aria-hidden="true" /></>}
          <button key="primary" type="button" className="gallery-selection-bar__action gallery-selection-bar__action--primary" aria-label={t("New album")} title={t("New album")} disabled={deleting} onClick={() => setCreating(true)}>
            <Plus size={20} aria-hidden="true" />
            <span>{t("New album")}</span>
          </button>
          <SelectionActions open={selectionMode} mobileVertical>
          <button type="button" className="gallery-selection-bar__action gallery-selection-bar__action--danger" aria-label={t("Delete selected albums")} title={t("Delete selected albums")}
            disabled={!canDelete || deleting} onClick={() => setDeleting(true)}><Trash2 size={20} aria-hidden="true" /><span>{t("Delete")}</span></button></SelectionActions>
        </PageActionBar>
      </footer>
      {deleting && <ConfirmationDialog title="Delete selected albums?" confirmLabel="Delete selected albums" danger onClose={() => setDeleting(false)} onConfirm={async () => {
        try {
          for (const album of selectedAlbums) {
            await albumService.remove(album.id);
            setSelectedIds((current) => { const next = new Set(current); next.delete(album.id); return next; });
          }
          cancelSelection();
        } finally {
          await invalidate();
        }
      }}>
        <p>{t("{count} selected", { count: selectedAlbums.length })}</p>
        <p>{t("Selected albums will be deleted. Saved media stay in your gallery.")}</p>
      </ConfirmationDialog>}
      {editing ? (
        <AlbumFormDialog
          album={editing}
          onClose={() => setEditing(null)}
          onDelete={async () => { await albumService.remove(editing.id); await invalidate(); }}
          onSubmit={async (input) => {
            await albumService.update(editing.id, input);
            await invalidate();
          }}
        />
      ) : null}
      {creating ? (
        <AlbumFormDialog
          onClose={() => setCreating(false)}
          onSubmit={async ({ name, isPublic }) => {
            const created = await albumService.create({ name, isPublic });
            await invalidate();
            return () => navigate(`/gallery/album/${created.id}`);
          }}
        />
      ) : null}
    </main>
  );
}
import { SelectionActions } from "../gallery/SelectionActions";
