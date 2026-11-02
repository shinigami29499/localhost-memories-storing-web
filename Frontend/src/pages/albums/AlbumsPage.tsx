import { startTransition, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Highlight, HighlightItem } from "@animate-ui/react/primitives/effects/highlight";
import { ScrollFade } from "@animate-ui/react/primitives/effects/scroll-fade";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Download } from "@/components/animate-ui/icons/download";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { X } from "@/components/animate-ui/icons/x";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { ConfirmationDialog, EmptyState, ErrorState, Spinner, showToast } from "../../components/ui";
import { PageTransition } from "../../components/layout/PageTransition";
import { readPageTransitionEffect } from "../../utils/pageTransition";
import { useLocale } from "../../context/LocaleContext";
import {
  albumKeys,
  AlbumCard,
  AlbumFormDialog,
  albumService,
  useAlbums,
  useInvalidateAlbums,
  type Album,
  type AlbumScope,
} from "../../features/albums";
import { useAuthStore } from "../../store/authStore";
import { useMediaSelectionDrag } from "../../features/media/hooks/useMediaSelectionDrag";
import type { MediaFile } from "../../features/media/types";
import { enqueueDownloads } from "../../features/downloads/services/downloadQueue";
import "../gallery/gallery.css";
import "./albums.css";

const scopes = [
  { value: "mine", label: "My albums" },
  { value: "public", label: "Public albums" },
] satisfies { value: AlbumScope; label: string }[];

export function AlbumsPage() {
  const { t, language } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requestRef = useRef(0);
  const [loadingScope, setLoadingScope] = useState(false);
  const pageTransition = readPageTransitionEffect();
  useEffect(() => () => { requestRef.current += 1; }, []);
  const me = useAuthStore((s) => s.user);
  const [scope, setScope] = useState<AlbumScope>("mine");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Album | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const albums = useAlbums(scope);
  const invalidate = useInvalidateAlbums();
  const items = albums.data ?? [];
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
  const selectionDragHandlers = useMediaSelectionDrag(!creating && !editing && !deleting && !saving, selectionMode, (id) => selectedIds.has(id), setSelected);
  useEffect(() => {
    if (!selectionMode || deleting || saving) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); cancelSelection(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectionMode, deleting, saving]);

  const downloadSelected = async () => {
    setSaving(true);
    try {
      const files: MediaFile[] = [];
      for (const album of selectedAlbums) {
        let offset = 0;
        while (true) {
          const page = await albumService.media(album.id, offset, 20);
          files.push(...page.items);
          offset = page.offset + page.items.length;
          if (offset >= page.total) break;
          if (page.items.length === 0) throw new Error(t("Could not load media."));
        }
      }
      const batchId = enqueueDownloads(files);
      showToast.success(t("Download batch started"), { description: t("Track downloads in Sync > Download."), onClick: () => navigate("/sync/download", { state: { highlightBatchId: batchId } }) });
      cancelSelection();
    } catch (error) {
      showToast.error(t("Could not start this download."), error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };
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
    <main className="gallery-page album-page" aria-label={t("Album")} {...selectionDragHandlers}>
      <div className="gallery-page__fixed-layout">
          <header className="gallery-page__header">
            <p className="gallery-page__eyebrow">{t("Keep what matters")}</p>
            <h1>{t("Album")}<span className="brand__dot">.</span></h1>
            <p>{t("Your memories, organized into albums.")}</p>
          </header>

          <div className="gallery-page__media-toolbar">
            <div className="gallery-page__media-filters" role="group" aria-label={t("Album scope")}>
              <Highlight value={scope} controlledItems className="gallery-page__media-highlight">
              {scopes.map(({ value, label }) => (
                <HighlightItem key={value} value={value} asChild>
                <button
                  type="button"
                  className="gallery-page__media-option"
                  aria-pressed={scope === value}
                  onClick={() => {
                    const request = ++requestRef.current;
                    if (value === scope) { setLoadingScope(false); return; }
                    setLoadingScope(true);
                    void queryClient.fetchQuery({ queryKey: albumKeys.list(value), queryFn: () => albumService.list(value) })
                      .catch(() => undefined)
                      .then(() => {
                        if (request !== requestRef.current) return;
                        setLoadingScope(false);
                        startTransition(() => { cancelSelection(); setScope(value); });
                      });
                  }}
                >
                  {t(label)}
                </button>
                </HighlightItem>
              ))}
              </Highlight>
            </div>
          </div>

          <ScrollFade asChild blur={0} shrink={0}>
          <div className="gallery-page__content gallery-page__media-scroll">
          <div className="gallery-page__tab-panel--media" aria-busy={loadingScope || undefined}>
          <PageTransition effect={pageTransition} transitionKey={scope}>
          {albums.isPending ? <Spinner label={t("Loading albums…")} /> : albums.isError ? (
            <ErrorState message={t("Could not load albums.")} onRetry={() => void albums.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              title={scope === "public" ? "No public albums yet" : "No albums yet"}
              hint={scope === "public"
                ? "Albums shared publicly will appear here."
                : "Use New album to organize your media into collections."}
            />
          ) : (
            <div className="gallery-groups" aria-busy={albums.isFetching}>
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
                        showOwner={scope === "public"}
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
          </PageTransition>
          </div>
          </div>
      </ScrollFade>
      </div>
      <footer className="gallery-page__footer albums-page__footer">
        <div className="gallery-selection-bar">
          <button type="button" className="gallery-selection-bar__action" aria-label={t("New album")} title={t("New album")} disabled={saving || deleting} onClick={() => setCreating(true)}>
            <Plus size={20} aria-hidden="true" />
            <span className="album-page__create-label">{t("New album")}</span>
          </button>
          <button type="button" className="gallery-selection-bar__action" aria-label={t("Download selected")} title={t("Download selected")}
            disabled={!selectedAlbums.some((album) => album.mediaCount > 0) || saving || deleting} aria-busy={saving || undefined} onClick={() => void downloadSelected()}>
            {saving ? <LoaderCircle size={20} className="spinner__wheel" aria-hidden="true" /> : <Download size={20} aria-hidden="true" />}
          </button>
          <button type="button" className="gallery-selection-bar__action gallery-selection-bar__action--danger" aria-label={t("Delete selected albums")} title={t("Delete selected albums")}
            disabled={!canDelete || saving || deleting} onClick={() => setDeleting(true)}><Trash2 size={20} aria-hidden="true" /></button>
          <button type="button" className="gallery-selection-bar__cancel" aria-label={t("Cancel selection")} title={t("Cancel selection")}
            disabled={!selectionMode || saving || deleting} onClick={cancelSelection}><X size={20} aria-hidden="true" /></button>
        </div>
      </footer>
      {deleting && <ConfirmationDialog title="Delete selected albums?" danger onClose={() => setDeleting(false)} onConfirm={async () => {
        try {
          for (const album of selectedAlbums) {
            await albumService.remove(album.id);
            setSelectedIds((current) => { const next = new Set(current); next.delete(album.id); return next; });
          }
          cancelSelection();
        } finally {
          await invalidate();
        }
      }}><p>{t("Selected albums will be deleted. Saved media stay in your gallery.")}</p></ConfirmationDialog>}
      {editing ? (
        <AlbumFormDialog
          album={editing}
          onClose={() => setEditing(null)}
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
            return () => navigate(`/library/album/${created.id}`);
          }}
        />
      ) : null}
    </main>
  );
}
