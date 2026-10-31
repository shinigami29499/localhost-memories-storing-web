import { useState } from "react";
import { EmptyState } from "../../components/ui/Status";
import { Pagination } from "../../components/ui/Pagination";
import { useLocale } from "../../context/LocaleContext";
import { DownloadBatchCard } from "../../features/downloads/components/DownloadBatchCard";
import { useDownloadStore } from "../../features/downloads/services/downloadQueue";
import "../../features/uploads/uploads.css";
import "./downloads.css";

const BATCHES_PER_PAGE = 10;

export function DownloadManagementPage() {
  const { t } = useLocale();
  const batches = useDownloadStore((state) => state.batches);
  const [page, setPage] = useState(1);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(batches.length / BATCHES_PER_PAGE)));
  return (
    <main className="upload-page" aria-labelledby="download-page-title">
      <div className="upload-page__content">
        <header className="upload-page__header">
          <div>
            <p className="upload-page__eyebrow">{t("Sync")}</p>
            <h1 id="download-page-title">{t("Download management")}<span className="brand__dot">.</span></h1>
            <p>{t("Download original images and videos, one file at a time.")}</p>
          </div>
        </header>
        <aside className="download-page__hint">
          <p>{t("Keep this tab open. Downloads and history clear when you reload or sign out.")}</p>
          <p>{t("Your browser may ask permission for each file or multiple downloads. On iPhone, files go to Downloads, not automatically to Photos.")}</p>
          <p>{t("Sent to browser means the file was handed to your browser; saving cannot be confirmed here. If blocked, download the file again.")}</p>
        </aside>
        {batches.length === 0 ? (
          <EmptyState title={t("No downloads yet")} hint={t("Use the download icon in the full-screen viewer or select media to download a batch.")} />
        ) : (
          <div className="upload-list">
            {batches.slice((currentPage - 1) * BATCHES_PER_PAGE, currentPage * BATCHES_PER_PAGE).map((batch, index) => (
              <DownloadBatchCard key={batch.id} batch={batch} displayId={batches.length - (currentPage - 1) * BATCHES_PER_PAGE - index} />
            ))}
          </div>
        )}
      </div>
      {batches.length > 0 ? (
        <footer className="upload-page__footer">
          <Pagination page={currentPage} pageSize={BATCHES_PER_PAGE} total={batches.length} onPageChange={setPage} itemLabel="batches" />
        </footer>
      ) : null}
    </main>
  );
}
