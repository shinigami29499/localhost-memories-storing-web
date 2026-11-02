import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { useLocale } from "../../context/LocaleContext";
import { ScrollProgress, ScrollProgressContainer, ScrollProgressProvider } from "@animate-ui/react/primitives/scroll-progress";
import { useAlbums, type Album } from "../../features/albums";
import { AlbumFeedPost } from "../../features/albums/components/AlbumFeedPost";
import { useAuthStore } from "../../store/authStore";
import "../albums/albums.css";
import "./home.css";

export function HomePage() {
  const { t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role.toLowerCase() === "admin";
  const mine = useAlbums("mine", !isAdmin);
  const publicAlbums = useAlbums("public", !isAdmin);
  const allAlbums = useAlbums("all", isAdmin);
  const albums: Album[] = isAdmin ? (allAlbums.data ?? []) : Array.from(
    new Map([...(mine.data ?? []), ...(publicAlbums.data ?? [])].map((album) => [album.id, album])).values(),
  );
  const isPending = isAdmin ? allAlbums.isPending : mine.isPending || publicAlbums.isPending;
  const isError = isAdmin ? allAlbums.isError : mine.isError || publicAlbums.isError;
  const isFetching = isAdmin ? allAlbums.isFetching : mine.isFetching || publicAlbums.isFetching;

  return (
    <main className="home-page">
      <ScrollProgressProvider>
        <div className="home-page__scroll-track" aria-hidden="true">
          <ScrollProgress mode="scaleX" className="home-page__scroll-progress" />
        </div>
        <ScrollProgressContainer className="home-page__content">
          <div className="home-page__inner">
            <header className="home-page__header">
              <h1>{t("Home")}<span className="brand__dot">.</span></h1>
              <p>{t(isAdmin ? "Browse all albums, including private albums." : "Browse albums you own and albums shared publicly.")}</p>
            </header>

            {isPending ? <Spinner label={t("Loading albums…")} /> : isError ? (
              <ErrorState
                message={t("Could not load albums.")}
                onRetry={() => {
                  if (isAdmin) void allAlbums.refetch();
                  else {
                    void mine.refetch();
                    void publicAlbums.refetch();
                  }
                }}
              />
            ) : albums.length === 0 ? (
              <EmptyState
                title="No albums yet"
                hint="Create an album in Albums to start organizing your media."
              />
            ) : (
              <div className="home-feed" aria-busy={isFetching}>
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
          </div>
        </ScrollProgressContainer>
      </ScrollProgressProvider>
    </main>
  );
}
