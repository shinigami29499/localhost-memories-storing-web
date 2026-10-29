import { Link } from "react-router-dom";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { useLocale } from "../../context/LocaleContext";
import { AlbumCard, useAlbums, type Album } from "../../features/albums";
import { useAuthStore } from "../../store/authStore";
import "../albums/albums.css";
import "./home.css";

export function HomePage() {
  const { t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const mine = useAlbums("mine");
  const publicAlbums = useAlbums("public");
  const albums: Album[] = Array.from(
    new Map([...(mine.data ?? []), ...(publicAlbums.data ?? [])].map((album) => [album.id, album])).values(),
  );
  const isPending = mine.isPending || publicAlbums.isPending;
  const isError = mine.isError || publicAlbums.isError;

  return (
    <main className="home-page">
      <header className="home-page__header">
        <h1>{t("Home")}<span className="brand__dot">.</span></h1>
        <p>{t("Browse albums you own and albums shared publicly.")}</p>
        <Link to="/albums" className="btn btn--secondary">{t("Manage albums")}</Link>
      </header>

      {isPending ? <Spinner label={t("Loading albums…")} /> : isError ? (
        <ErrorState
          message={t("Could not load albums.")}
          onRetry={() => {
            void mine.refetch();
            void publicAlbums.refetch();
          }}
        />
      ) : albums.length === 0 ? (
        <EmptyState
          title={t("No viewable albums yet")}
          hint={t("Create an album or browse public albums to get started.")}
        />
      ) : (
        <div className="album-grid" aria-busy={mine.isFetching || publicAlbums.isFetching}>
          {albums.map((album) => {
            const isOwner = album.owner.id === user?.id;
            return (
              <AlbumCard
                key={album.id}
                album={album}
                isOwner={isOwner}
                showOwner={!isOwner}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
