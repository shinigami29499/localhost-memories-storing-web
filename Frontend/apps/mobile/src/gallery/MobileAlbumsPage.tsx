import { MobilePageLink as Link } from "../layout/mobilePageNavigation";
import { useLocale } from "@/context/LocaleContext";
import { AlbumDateView } from "@/features/albums/components/AlbumDateView";
import { MobileAlbumFormDialog } from "./MobileAlbumFormDialog";
import { useAlbumsPage } from "@/pages/albums/useAlbumsPage";

export function MobileAlbumsPage() {
  const { t } = useLocale();
  const { creating, setCreating, albumsQuery, today, selectedDate, selectDate, albumDates, items, albumIndex,
    selectAlbumIndex, rememberOpenedAlbum, createAlbum } = useAlbumsPage();

  return (
    <main className="mobile-albums-page gallery-page album-date-view" aria-label={t("Album")}>
      <AlbumDateView AlbumLink={Link} today={today} selectedDate={selectedDate} onDateChange={selectDate} albumDates={albumDates} albums={items}
        albumIndex={albumIndex} onAlbumIndexChange={selectAlbumIndex} onAlbumOpen={rememberOpenedAlbum}
        pending={albumsQuery.isPending} failed={albumsQuery.isError} fetching={albumsQuery.isFetching}
        onRetry={() => void albumsQuery.refetch()} onCreate={() => setCreating(true)} />
      {creating && <MobileAlbumFormDialog onClose={() => setCreating(false)} onSubmit={createAlbum} />}
    </main>
  );
}
