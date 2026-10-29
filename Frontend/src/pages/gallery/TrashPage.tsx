import { useEffect, useState } from "react";
import { Image } from "@/components/animate-ui/icons/image";
import { Video } from "@/components/animate-ui/icons/video";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmationDialog } from "../../components/ui/ConfirmationDialog";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { Pagination, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../components/ui/Pagination";
import { showToast } from "../../components/ui/Toast";
import { useLocale } from "../../context/LocaleContext";
import { mediaService } from "../../features/media/services/mediaService";
import type { MediaFile, MediaKindFilter } from "../../features/media/types";
import { mediaUrl } from "../../utils/media";
import "./gallery.css";
import "../../features/media/components/media.css";

const filters: { value: MediaKindFilter | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
];

export function TrashPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<MediaKindFilter | undefined>();
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState<number>(() => {
    const stored = Number(window.localStorage.getItem("trash.limit"));
    return PAGE_SIZE_OPTIONS.some((size) => size === stored) ? stored : DEFAULT_PAGE_SIZE;
  });
  const [restoreMedia, setRestoreMedia] = useState<MediaFile | null>(null);
  const page = Math.floor(offset / limit) + 1;
  const queryKey = ["media", "deleted", offset, limit, filter] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => mediaService.deleted(offset, limit, filter),
    placeholderData: (previous) => previous,
  });

  const restore = useMutation({
    mutationFn: (mediaId: string) => mediaService.restore(mediaId),
    onSuccess: async () => {
      showToast.success(t("Media restored successfully"));
      setRestoreMedia(null);
      await queryClient.invalidateQueries({ queryKey: ["media", "deleted"] });
      await queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (error) => {
      showToast.error(t("Could not restore the media."), error instanceof Error ? error.message : undefined);
    },
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setOffset((totalPages - 1) * limit);
  }, [limit, page, totalPages]);

  return (
    <>
      <main className="gallery-page">
        <div className="gallery-page__content">
          <div className="gallery-page__inner">
            <header className="gallery-page__header">
              <p className="gallery-page__eyebrow">{t("Your library")}</p>
              <h1>{t("Trash")}<span className="brand__dot">.</span></h1>
              <p>{t("Restore deleted media to your library.")}</p>
            </header>

            <div className="gallery-page__toolbar">
              <div className="gallery-page__filters" role="group" aria-label={t("Filter media")}>
                {filters.map(({ value, label }) => (
                  <button
                    key={value ?? "all"}
                    type="button"
                    className="gallery-page__filter"
                    aria-pressed={filter === value}
                    onClick={() => {
                      setFilter(value);
                      setOffset(0);
                    }}
                  >
                    {t(label)}
                  </button>
                ))}
              </div>
            </div>

            {query.isLoading ? <Spinner label={t("Loading media…")} /> : null}
            {query.isError ? (
              <ErrorState message={t("Could not load media.")} onRetry={() => void query.refetch()} />
            ) : null}
            {!query.isLoading && !query.isError && query.data?.items.length === 0 ? (
              <EmptyState title="Trash is empty" hint="Deleted media will appear here." />
            ) : null}
            {query.data?.items.length ? (
              <>
                <div className="media-grid">
                  {query.data.items.map((media) => (
                    <article key={media.id} className="media-card">
                      {media.mediaKind === "video" ? (
                        <video
                          className="media-card__preview"
                          src={mediaUrl(media.id, true)}
                          controls
                          preload="metadata"
                          aria-label={media.originalFilename}
                        />
                      ) : (
                        <img
                          className="media-card__preview"
                          src={mediaUrl(media.id, true)}
                          alt={media.originalFilename}
                          loading="lazy"
                        />
                      )}
                      <footer className="media-card__footer">
                        <span className="media-card__name" title={media.originalFilename}>{media.originalFilename}</span>
                        <button
                          type="button"
                          className="btn btn--secondary"
                          disabled={restore.isPending}
                          onClick={() => setRestoreMedia(media)}
                        >
                          {media.mediaKind === "video" ? <Video size={16} aria-hidden="true" /> : <Image size={16} aria-hidden="true" />}
                          {t("Restore")}
                        </button>
                      </footer>
                    </article>
                  ))}
                </div>
                <footer className="upload-page__footer">
                  <Pagination
                    page={page}
                    pageSize={limit}
                    total={total}
                    itemLabel="media items"
                    isFetching={query.isFetching}
                    onPageChange={(nextPage) => setOffset((nextPage - 1) * limit)}
                    onPageSizeChange={(pageSize) => {
                      setLimit(pageSize);
                      setOffset(0);
                      window.localStorage.setItem("trash.limit", String(pageSize));
                    }}
                  />
                </footer>
              </>
            ) : null}
          </div>
        </div>
      </main>
      {restoreMedia ? (
        <ConfirmationDialog
          title="Restore media?"
          onClose={() => setRestoreMedia(null)}
          onConfirm={() => restore.mutateAsync(restoreMedia.id)}
        >
          {t("Restore this media to your library?")}
        </ConfirmationDialog>
      ) : null}
    </>
  );
}
