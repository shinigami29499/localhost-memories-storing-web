import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { Link } from "react-router-dom";
import { useLocale } from "../../context/LocaleContext";
import { useInfiniteAlbums, type Album } from "../../features/albums";
import { AlbumFeedPost } from "../../features/albums/components/AlbumFeedPost";
import { useAuthStore } from "../../store/authStore";
import "../albums/albums.css";
import "./home.css";

export function HomePage() {
  const { t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role.toLowerCase() === "admin";
  const albumsQuery = useInfiniteAlbums(isAdmin ? "all" : "feed");
  const albums: Album[] = albumsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <main className="home-page">
        <div className="home-page__content">
          <div className="home-page__inner">
            <header className="home-page__header">
              <p className="home-page__eyebrow">{t("Your library")}</p>
              <h1>{t("Home")}<span className="brand__dot">.</span></h1>
              <p>{t(isAdmin ? "Browse all albums, including private albums." : "Browse albums you own and albums shared publicly.")}</p>
            </header>

            {albumsQuery.isPending ? <Spinner page label={t("Loading albums...")} /> : albumsQuery.isError && albums.length === 0 ? (
              <ErrorState
                message={t("Could not load albums.")}
                onRetry={() => void albumsQuery.refetch()}
              />
            ) : albums.length === 0 ? (
              <EmptyState
                title="No albums yet"
                hint="Create an album in Albums to start organizing your media."
                action={<Link className="btn btn--primary" to="/gallery/album">{t("Go to albums")}</Link>}
              />
            ) : (
              <div className="home-feed" aria-busy={albumsQuery.isFetching}>
                {albums.map((album) => {
                  const isOwner = album.owner.id === user?.id;
                  return (
                    <AlbumFeedPost
                      key={album.id}
                      album={album}
                      canDelete={isOwner || user?.role.toLowerCase() === "admin"}
                    />
                  );
                })}
              </div>
            )}
            {albumsQuery.isFetchNextPageError ? (
              <ErrorState message={t("Could not load more albums.")} onRetry={() => void albumsQuery.fetchNextPage()} />
            ) : null}
            {albumsQuery.hasNextPage ? (
              <button type="button" className="btn btn--secondary" disabled={albumsQuery.isFetchingNextPage}
                onClick={() => void albumsQuery.fetchNextPage()}>
                {t(albumsQuery.isFetchingNextPage ? "Loading albums..." : "Load more")}
              </button>
            ) : null}
          </div>
        </div>
    </main>
  );
}
