import { ImageIcon } from "@/components/animate-ui/icons/image";
import { VideoIcon } from "@/components/animate-ui/icons/video";
import { EmptyState, ErrorState } from "@/components/ui";
import { PageDataPlaceholder } from "@/components/ui/PageDataPlaceholder";
import { useLocale } from "@/context/LocaleContext";
import { useAlbum } from "@/features/albums/hooks/useAlbums";
import { ApiError } from "@/services/api";
import { useParams } from "react-router-dom";
import { MobileAlbumImageCarousel } from "./MobileAlbumImageCarousel";
import "./mobile-album-detail.css";
import "./mobile-gallery-shared.css";

export function MobileAlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const { t } = useLocale();
  const album = useAlbum(albumId);

  return (
    <div className="mobile-album-page">
      {album.isPending ? (
        <main className="gallery-page album-page mobile-content-placeholder--album-detail">
          <PageDataPlaceholder layout="cards" label={t("Loading album...")} count={1} />
        </main>
      ) : album.isError ? (
        <main className="gallery-page album-page">
          <div className="gallery-page__content">
            <div className="gallery-page__inner">
              {album.error instanceof ApiError && album.error.status === 404 ? (
                <EmptyState title="Album not found" hint="It may be private or deleted." />
              ) : (
                <ErrorState message={t("Could not load this album.")} onRetry={() => void album.refetch()} />
              )}
            </div>
          </div>
        </main>
      ) : (
        <main className="gallery-page album-page" aria-label={album.data.name}>
          <div className="gallery-page__fixed-layout">
            <div className="gallery-page__content">
              <header className="album-hero">
                <div className="album-hero__text">
                  <h1 className="mobile-album-detail__title">{album.data.name}</h1>
                  <p className="gallery-page__eyebrow mobile-album-detail__byline">
                    {`${t(album.data.isPublic ? "Public" : "Private")} · ${album.data.owner.username}`}
                  </p>
                </div>
                <MobileAlbumImageCarousel key={album.data.id} albumId={album.data.id} imageCount={album.data.imageCount} />
                {(album.data.imageCount !== undefined || album.data.videoCount !== undefined) && (
                  <div className="mobile-album-detail__counts">
                    {album.data.imageCount !== undefined && <span><ImageIcon aria-hidden="true" />{t("Images")} {album.data.imageCount}</span>}
                    {album.data.videoCount !== undefined && <span><VideoIcon aria-hidden="true" />{t("Videos")} {album.data.videoCount}</span>}
                  </div>
                )}
              </header>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
