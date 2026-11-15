import { CheckCheckIcon } from "@/components/animate-ui/icons/check-check";
import { PaperclipIcon } from "@/components/animate-ui/icons/paperclip";
import { UploadIcon } from "@/components/animate-ui/icons/upload";
import { XIcon } from "@/components/animate-ui/icons/x";
import { Button, DatePicker } from "@/components/ui";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/Status";
import { MobileUploadBatchCard } from "./MobileUploadBatchCard";
import { useUploadManagement } from "@/pages/uploads/useUploadManagement";
import "./mobile-uploads.css";

export function MobileUploadPage() {
  const { t, unread, user, selectedFiles, setSelectedFiles, submitting, selectedDate, setSearchParams,
    busyItemIds, uploadInput, sentinel, query, clearSelection, submitFiles, removeRecord, togglePause, batches } = useUploadManagement();
  return <main className="upload-page mobile-uploads" aria-label={t("Upload")}>
    <div className="upload-page__content mobile-uploads__content">
      <section className="mobile-uploads__start" aria-label={t("Upload media")}>
        <input ref={uploadInput} id="mobile-upload-media-files" hidden aria-label={t("Select images or videos")}
          type="file" accept="image/*,video/*" multiple disabled={submitting}
          onChange={(event) => setSelectedFiles(Array.from(event.currentTarget.files ?? []))} />
        <div className="mobile-uploads__start-copy"><h1>{t("Upload media")}</h1><p>{t("Select images or videos")}</p></div>
        <div className="mobile-uploads__primary-actions">
          <Button type="button" variant="secondary" className="mobile-uploads__select" disabled={submitting} onClick={() => uploadInput.current?.click()}><PaperclipIcon size={18} aria-hidden="true" />{t("Select files")}</Button>
          <Button type="button" className="mobile-uploads__upload" busy={submitting} disabled={selectedFiles.length === 0} onClick={() => void submitFiles()}>{!submitting && <UploadIcon size={18} aria-hidden="true" />}{t(submitting ? "Starting upload..." : "Upload media")}</Button>
        </div>
        {selectedFiles.length > 0 && <button type="button" className="mobile-uploads__selection" disabled={submitting} onClick={clearSelection} aria-label={t("Clear selection")}><span>{t("{count} files selected", { count: selectedFiles.length })}</span><XIcon size={18} aria-hidden="true" /></button>}
      </section>
      <div className="mobile-uploads__history-header"><h2>{t("Upload history")}</h2>
        <Button type="button" variant="ghost" className="mobile-uploads__read" aria-label={t("Mark all as read")} title={t("Mark all as read")}
          disabled={!unread.success && !unread.pending && !unread.failed && !unread.hasUnseenBatches(batches)} onClick={() => unread.markAllRead(batches)}><CheckCheckIcon size={18} aria-hidden="true" /></Button>
      </div>
      <DatePicker className="mobile-uploads__date" compactOnMobile label={t("Created date")} value={selectedDate} onChange={(nextDate) => {
        setSearchParams((current) => { const next = new URLSearchParams(current); if (nextDate) next.set("date", nextDate); else next.delete("date"); return next; });
      }} />
      {query.isPending ? <Spinner label={t("Loading uploads...")} /> : query.isError && !query.data ? <ErrorState message="Could not load uploads." onRetry={() => void query.refetch()} /> : batches.length === 0 ? <EmptyState title={selectedDate ? "No uploads on this date" : "No uploads yet"} hint={selectedDate ? "Choose another date or clear the filter to see other uploads." : "Choose files above and upload them to create your first batch."} /> : <>
        <div className="upload-list mobile-uploads__list" aria-live="polite">{batches.map((batch, index) => <MobileUploadBatchCard key={batch.id} batch={batch} displayId={index + 1} showUsername avatarUser={user ?? undefined} busyItemIds={busyItemIds}
          onDelete={(batch, item) => removeRecord(batch, item)} onDeleteMany={(batch, items) => removeRecord(batch, undefined, items)} onPause={(batch, item, paused) => void togglePause(batch, item, paused)} />)}</div>
        {query.isFetchNextPageError ? <ErrorState message="Could not load more uploads." onRetry={() => void query.fetchNextPage()} /> : query.hasNextPage && <div ref={sentinel}>{query.isFetchingNextPage && <Spinner />}</div>}
      </>}
    </div>
  </main>;
}
