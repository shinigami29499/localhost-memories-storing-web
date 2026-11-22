import { Link } from "react-router-dom";
import { useLocale } from "@/context/LocaleContext";
import { AlbumFormDialog } from "@/features/albums";
import { AlbumDateView } from "@/features/albums/components/AlbumDateView";
import { useAlbumsPage } from "@/pages/albums/useAlbumsPage";
import "./albums.css";

export function AlbumsPage() {
  const { t } = useLocale();
  const { creating, setCreating, albumsQuery, today, selectedDate, selectDate, albumDates, items, albumIndex,
    selectAlbumIndex, rememberOpenedAlbum, createAlbum, favoriteBusyAlbumId, toggleFavorite } = useAlbumsPage();

  return (
    <main className="gallery-page album-page album-date-view" aria-label={t("Album")}>
      <AlbumDateView AlbumLink={Link} today={today} selectedDate={selectedDate} onDateChange={selectDate} albumDates={albumDates} albums={items}
        albumIndex={albumIndex} onAlbumIndexChange={selectAlbumIndex} onAlbumOpen={rememberOpenedAlbum}
        favoriteBusyAlbumId={favoriteBusyAlbumId} onFavorite={(albumId, isFavorited) => void toggleFavorite(albumId, isFavorited)}
        pending={albumsQuery.isPending} failed={albumsQuery.isError} fetching={albumsQuery.isFetching}
        onRetry={() => void albumsQuery.refetch()} />
      {creating && <AlbumFormDialog onClose={() => setCreating(false)} onSubmit={createAlbum} />}
    </main>
  );
}
