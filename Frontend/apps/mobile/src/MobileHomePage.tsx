import { Link } from "react-router-dom";
import { useInfiniteAlbums } from "@/features/albums/hooks/useAlbums";
import { useAuthStore } from "@/store/authStore";
import { useLocale } from "@/context/LocaleContext";
import { MobileAlbumFeedPost } from "./MobileAlbumFeedPost";
import { ErrorState, Spinner } from "@/components/ui";

export function HomePage() {
  const { t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const albums = useInfiniteAlbums(user?.role.toLowerCase() === "admin" ? "all" : "feed");
  const items = albums.data?.pages.flatMap((page) => page.items) ?? [];
  return <main className="mobile-home">
    <div className="mobile-home__heading"><div><h1>{t("Your library")}</h1><p>{t("Browse albums you own and albums shared publicly.")}</p></div><Link to="/gallery/album">{t("Album")}</Link></div>
    {albums.isPending ? <Spinner label={t("Loading albums...")} /> : albums.isError && items.length === 0 ? <ErrorState message={t("Could not load albums.")} onRetry={() => void albums.refetch()} /> : items.length === 0 ? <div className="mobile-empty"><h2>{t("No albums yet")}</h2><p>{t("Create an album in Albums to start organizing your media.")}</p><Link to="/gallery/album">{t("Go to albums")}</Link></div> : <div className="mobile-albums">{items.map((album) => <MobileAlbumFeedPost key={album.id} album={album} canDelete={album.owner.id === user?.id || user?.role.toLowerCase() === "admin"} />)}</div>}
    {albums.isFetchNextPageError && <ErrorState message={t("Could not load more albums.")} onRetry={() => void albums.fetchNextPage()} />}
    {albums.hasNextPage && <button className="mobile-load" type="button" disabled={albums.isFetchingNextPage} onClick={() => void albums.fetchNextPage()}>{t(albums.isFetchingNextPage ? "Loading albums..." : "Load more")}</button>}
  </main>;
}
