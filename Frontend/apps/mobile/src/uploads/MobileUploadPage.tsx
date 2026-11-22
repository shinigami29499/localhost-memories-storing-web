import { Link } from "react-router-dom";
import { CheckCheckIcon } from "@/components/animate-ui/icons/check-check";
import { Button, DatePicker } from "@/components/ui";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/Status";
import { PageDataPlaceholder } from "@/components/ui/PageDataPlaceholder";
import { MobileUploadBatchCard } from "./MobileUploadBatchCard";
import { useUploadManagement } from "@/pages/uploads/useUploadManagement";
import "./mobile-uploads.css";

export function MobileUploadPage() {
  const { t, unread, user, selectedDate, setSearchParams,
    busyItemIds, sentinel, query, removeRecord, togglePause, batches } = useUploadManagement();
  return <main className="upload-page mobile-uploads" aria-label={t("Upload")}>
    <div className="upload-page__content mobile-uploads__content">
      <Link className="btn btn--secondary" to="/album">{t("Go to albums")}</Link>
      <div className="mobile-uploads__history-header"><h2>{t("Upload history")}</h2>
        <Button type="button" variant="ghost" className="mobile-uploads__read" aria-label={t("Mark all as read")} title={t("Mark all as read")}
          disabled={!unread.success && !unread.pending && !unread.failed && !unread.hasUnseenBatches(batches)} onClick={() => unread.markAllRead(batches)}><CheckCheckIcon size={18} aria-hidden="true" /></Button>
      </div>
      <DatePicker className="mobile-uploads__date" compactOnMobile label={t("Created date")} value={selectedDate} onChange={(nextDate) => {
        setSearchParams((current) => { const next = new URLSearchParams(current); if (nextDate) next.set("date", nextDate); else next.delete("date"); return next; });
      }} />
      {query.isPending ? <PageDataPlaceholder layout="cards" label={t("Loading uploads...")} /> : query.isError && !query.data ? <ErrorState message="Could not load uploads." onRetry={() => void query.refetch()} /> : batches.length === 0 ? <EmptyState title={selectedDate ? "No uploads on this date" : "No uploads yet"} hint={selectedDate ? "Choose another date or clear the filter to see other uploads." : "Open an album to upload images or videos."} /> : <>
        <div className="upload-list mobile-uploads__list" aria-live="polite">{batches.map((batch, index) => <MobileUploadBatchCard key={batch.id} batch={batch} displayId={index + 1} showUsername avatarUser={user ?? undefined} busyItemIds={busyItemIds}
          onDelete={(batch, item) => removeRecord(batch, item)} onDeleteMany={(batch, items) => removeRecord(batch, undefined, items)} onPause={(batch, item, paused) => void togglePause(batch, item, paused)} />)}</div>
        {query.isFetchNextPageError ? <ErrorState message="Could not load more uploads." onRetry={() => void query.fetchNextPage()} /> : query.hasNextPage && <div ref={sentinel}>{query.isFetchingNextPage && <Spinner />}</div>}
      </>}
    </div>
  </main>;
}
