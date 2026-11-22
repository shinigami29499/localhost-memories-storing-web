import { Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { useBlocker, useLocation, useNavigate } from "react-router-dom";
import { MobilePageLink as Link, useOpenMobilePage, type MobileAlbumCreateEntry } from "../layout/mobilePageNavigation";
import { useLocale } from "@/context/LocaleContext";
import { AlbumDateView } from "@/features/albums/components/AlbumDateView";
import { MobileAlbumFormDialog } from "./MobileAlbumFormDialog";
import { useAlbumsPage } from "@/pages/albums/useAlbumsPage";

export function MobileAlbumsPage() {
  const { t } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const openPage = useOpenMobilePage();
  const createEntry = location.state?.mobileAlbumCreate as MobileAlbumCreateEntry | undefined;
  const creating = Boolean(createEntry);
  const addButton = useRef<HTMLButtonElement>(null);
  const wasCreating = useRef(false);
  const saving = useRef(false);
  const { albumsQuery, today, selectedDate, selectedDateKey, selectDate, albumDates, items, albumIndex,
    selectAlbumIndex, rememberOpenedAlbum, createAlbum, favoriteBusyAlbumId, toggleFavorite } =
    useAlbumsPage({
      listLocationKey: createEntry?.listLocationKey,
      onAlbumCreated: (albumId) => openPage(`/album/${albumId}`, undefined, { replace: true }),
    });
  const showCreateAction = !albumsQuery.isPending && (!albumsQuery.isError || items.length > 0);
  const blocker = useBlocker(() => creating && saving.current);
  const closeCreate = () => {
    // Successful submission replaces the dialog entry after the form calls onClose.
    if (!saving.current) void navigate(-1);
  };

  useEffect(() => {
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (wasCreating.current && !creating) addButton.current?.focus({ preventScroll: true });
    wasCreating.current = creating;
  }, [creating]);

  return (
    <main className="mobile-albums-page gallery-page album-date-view" aria-label={t("Album")}
      data-create-action={showCreateAction || undefined}>
      <AlbumDateView AlbumLink={Link} today={today} selectedDate={selectedDate} onDateChange={selectDate} albumDates={albumDates} albums={items}
        albumIndex={albumIndex} onAlbumIndexChange={selectAlbumIndex} onAlbumOpen={rememberOpenedAlbum}
        favoriteBusyAlbumId={favoriteBusyAlbumId} onFavorite={(albumId, isFavorited) => void toggleFavorite(albumId, isFavorited)}
        mobileNavigation
        footerAction={showCreateAction && <div className="mobile-albums-page__footer">
          <button ref={addButton} type="button" className="mobile-albums-page__create mobile-animated-gradient"
            onClick={() => void navigate(location, { state: {
              ...location.state, mobileAlbumCreate: { albumDate: selectedDateKey, listLocationKey: location.key },
            } })}>
            <Plus size={18} aria-hidden="true" />
            {t("Add album")}
          </button>
        </div>}
        pending={albumsQuery.isPending} failed={albumsQuery.isError} fetching={albumsQuery.isFetching}
        onRetry={() => void albumsQuery.refetch()} />
      {createEntry && <MobileAlbumFormDialog
        onClose={closeCreate}
        onSubmit={async (input) => {
          saving.current = true;
          try {
            const openCreatedAlbum = await createAlbum(input, createEntry.albumDate);
            return () => {
              saving.current = false;
              openCreatedAlbum();
            };
          } catch (error) {
            saving.current = false;
            throw error;
          }
        }} />}
    </main>
  );
}
