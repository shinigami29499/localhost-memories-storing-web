import { MobileConfirmationDialog } from "./MobileConfirmationDialog";
﻿import { useState } from "react";
import { MobilePageLink as Link } from "../layout/mobilePageNavigation";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Trash2 } from "@/components/animate-ui/icons/trash-2";
import { PencilLine } from "@/components/animate-ui/icons/pencil-line";
import { Bookmark } from "@/components/animate-ui/icons/bookmark";
import { Check } from "@/components/animate-ui/icons/check";
import { PageActionBar } from "../layout/MobilePageActionBar";
import {  EmptyState, ErrorState, Spinner } from "@/components/ui";
import { useLocale } from "@/context/LocaleContext";
import type { Album } from "@/features/albums/types";
import { MobileAlbumFormDialog } from "./MobileAlbumFormDialog";
import { MobileSelectionActions } from "./MobileSelectionActions";
import { useAlbumsPage } from "@/pages/albums/useAlbumsPage";
import { mediaPreviewUrl } from "@/utils/media";
import "./mobile-albums.css";

function MobileAlbumCard({ album, selected, selectionMode, onSelect, onEdit, isOwner }: {
  album: Album; selected: boolean; selectionMode: boolean; onSelect: () => void; onEdit: () => void; isOwner: boolean;
}) {
  const { t } = useLocale();
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const preview = album.previewMediaId;
  return <article className="mobile-album-card">
    <Link to={`/gallery/album/${album.id}`} className="mobile-album-card__link" data-media-id={album.id}
      role={selectionMode ? "checkbox" : undefined} aria-checked={selectionMode ? selected : undefined}
      aria-label={t(selectionMode ? "Select album {name}" : "Open album {name}", { name: album.name })}
      aria-description={t("Hold to select, or press Shift+Space.")}
      onDragStart={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => { if ((event.shiftKey || selectionMode) && event.key === " ") { event.preventDefault(); if (!event.repeat) onSelect(); } }}
      onClick={(event) => { if (selectionMode) { event.preventDefault(); onSelect(); } }}>
      <span className="mobile-album-card__image">
        {preview && preview !== failedPreview ? <img src={mediaPreviewUrl(preview)} alt="" loading="lazy" decoding="async" onError={() => setFailedPreview(preview)} /> : <Bookmark size={30} aria-hidden="true" />}
        <span className="mobile-album-card__count" aria-label={t("{count} media", { count: album.mediaCount })}>{album.mediaCount}</span>
        {selectionMode && <span className="mobile-album-card__selection" aria-hidden="true">{selected && <Check size={16} />}</span>}
      </span>
      <strong className="mobile-album-card__name">{album.name}</strong>
      <span className="mobile-album-card__meta">{t("by {owner}", { owner: album.owner.username })} · {t(album.isPublic ? "Public" : "Private")}</span>
    </Link>
    {isOwner && !selectionMode && <button className="mobile-album-card__edit" type="button" aria-label={t("Edit album {name}", { name: album.name })} title={t("Edit album")} onClick={onEdit}><PencilLine size={18} aria-hidden="true" /></button>}
  </article>;
}

export function MobileAlbumsPage() {
  const { t } = useLocale();
  const { me, creating, setCreating, editing, setEditing, selectionMode, selectedIds, deleting, setDeleting,
    albumsQuery: albums, sentinelRef, items, selectedAlbums, canDelete, cancelSelection, setSelected,
    selectionDragHandlers: drag, deleteSelected, deleteEditing, updateEditing, createAlbum } = useAlbumsPage();

  return <main className="mobile-albums-page gallery-page" aria-label={t("Album")} {...drag}
    onClickCapture={(event) => { drag.onClickCapture(event); if (!event.defaultPrevented && !deleting && selectionMode && !(event.target instanceof Element && event.target.closest("[data-media-id], .gallery-selection-bar"))) cancelSelection(); }}>
    <div className="mobile-albums-page__scroll">
      {albums.isPending ? <Spinner page label={t("Loading albums...")} /> : albums.isError && items.length === 0 ? <ErrorState message={t("Could not load albums.")} onRetry={() => void albums.refetch()} /> : items.length === 0 ? <EmptyState title="No albums yet" hint="Use New album to organize your media into collections." action={<button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>{t("New album")}</button>} /> :
        <div className="mobile-albums-grid" aria-busy={albums.isFetching}>{items.map((album) => <MobileAlbumCard key={album.id} album={album} isOwner={album.owner.id === me?.id} selectionMode={selectionMode} selected={selectedIds.has(album.id)} onSelect={() => setSelected(album.id, !selectedIds.has(album.id))} onEdit={() => setEditing(album)} />)}</div>}
      {albums.isFetchNextPageError && <ErrorState message={t("Could not load more albums.")} onRetry={() => void albums.fetchNextPage()} />}
      {albums.isFetchingNextPage && <Spinner label={t("Loading albums...")} />}
      <div ref={sentinelRef} aria-hidden="true" />
    </div>
    <PageActionBar className="gallery-page__actions" role="group" aria-label={t("{count} selected", { count: selectedIds.size })}>
      <span className="gallery-selection-bar__status" role="status">{t("{count} selected", { count: selectedIds.size })}</span>
      {!selectionMode && <button type="button" className="gallery-selection-bar__action gallery-selection-bar__action--primary" aria-label={t("New album")} title={t("New album")} disabled={deleting} onClick={() => setCreating(true)}><Plus size={20} aria-hidden="true" /><span>{t("New album")}</span></button>}
      <MobileSelectionActions open={selectionMode} mobileVertical><button type="button" className="gallery-selection-bar__action gallery-selection-bar__action--danger" aria-label={t("Delete selected albums")} title={t("Delete selected albums")} disabled={!canDelete || deleting} onClick={() => setDeleting(true)}><Trash2 size={20} aria-hidden="true" /><span>{t("Delete")}</span></button></MobileSelectionActions>
    </PageActionBar>
    {deleting && <MobileConfirmationDialog title="Delete selected albums?" confirmLabel="Delete selected albums" danger onClose={() => setDeleting(false)} onConfirm={deleteSelected}><p>{t("{count} selected", { count: selectedAlbums.length })}</p><p>{t("Selected albums will be deleted. Saved media stay in your gallery.")}</p></MobileConfirmationDialog>}
    {editing && <MobileAlbumFormDialog album={editing} onClose={() => setEditing(null)} onDelete={deleteEditing} onSubmit={updateEditing} />}
    {creating && <MobileAlbumFormDialog onClose={() => setCreating(false)} onSubmit={createAlbum} />}
  </main>;
}


