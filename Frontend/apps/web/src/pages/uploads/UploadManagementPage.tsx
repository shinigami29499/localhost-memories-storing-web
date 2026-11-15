import { EmptyState, ErrorState, Spinner } from "@/components/ui/Status";
import { Button, DatePicker } from "@/components/ui";
import { useUploadManagement } from "@/pages/uploads/useUploadManagement";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { CheckCheckIcon } from "@/components/animate-ui/icons/check-check";
import { PaperclipIcon } from "@/components/animate-ui/icons/paperclip";
import { UploadIcon } from "@/components/animate-ui/icons/upload";
import { XIcon } from "@/components/animate-ui/icons/x";
import { UploadBatchCard } from "@/features/uploads/components/UploadBatchCard";
import "../../../../../src/features/uploads/uploads.css";

export function UploadManagementPage() {
  const { t, unread, user, selectedFiles, setSelectedFiles, submitting, selectedDate, setSearchParams, busyItemIds, uploadInput, sentinel, query, clearSelection, submitFiles, removeRecord, togglePause, batches } = useUploadManagement();

  return (
    <main className="upload-page" aria-label={t("Upload")}>
      <div className="upload-page__content">
        <div className="upload-page__toolbar">
          <input
            ref={uploadInput}
            id="upload-media-files"
            hidden
            aria-label={t("Select images or videos")}
            type="file"
            accept="image/*,video/*"
            multiple
            disabled={submitting}
            onChange={(event) => setSelectedFiles(Array.from(event.currentTarget.files ?? []))}
          />
          <div className="upload-page__actions">
            <Button
              type="button"
              variant="secondary"
              className="upload-page__attach-button"
              disabled={submitting}
              onClick={() => uploadInput.current?.click()}
            >
              <PaperclipIcon size={18} aria-hidden="true" />
              <span className="upload-page__button-label">{t("Select files")}</span>
            </Button>
            <Button
              type="button"
              className="upload-page__upload-button"
              busy={submitting}
              disabled={selectedFiles.length === 0}
              onClick={() => void submitFiles()}
            >
              {submitting ? null : <UploadIcon size={18} aria-hidden="true" />}
              <span className="upload-page__button-label">{submitting ? t("Starting upload...") : t("Upload media")}</span>
            </Button>
            {selectedFiles.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                className="upload-page__selection-button"
                aria-label={t("Clear selection")}
                title={t("Clear selection")}
                disabled={submitting}
                onClick={clearSelection}
              >
                <XIcon size={18} aria-hidden="true" />
                <span>{t("{count} files selected", { count: selectedFiles.length })}</span>
              </Button>
            ) : null}
          </div>
          <div className="upload-page__filters">
            <AnimateIcon animateOnHover animateOnTap completeOnStop asChild><Button type="button" variant="ghost" className="upload-page__activity-button" aria-label={t("Mark all as read")} title={t("Mark all as read")} disabled={!unread.success && !unread.pending && !unread.failed && !unread.hasUnseenBatches(batches)} onClick={() => unread.markAllRead(batches)}>
              <CheckCheckIcon size={18} aria-hidden="true" /><span className="upload-page__button-label">{t("Mark all as read")}</span>
            </Button></AnimateIcon>
            <DatePicker
              className="upload-page__date-filter"
              compactOnMobile
              label={t("Created date")}
              value={selectedDate}
              onChange={(nextDate) => {
                setSearchParams((current) => {
                  const next = new URLSearchParams(current);
                  if (nextDate) next.set("date", nextDate);
                  else next.delete("date");
                  return next;
                });
              }}
            />
          </div>
        </div>

        {query.isPending ? <Spinner page label="Loading uploads..." /> : query.isError && !query.data ? (
          <ErrorState message="Could not load uploads." onRetry={() => void query.refetch()} />
        ) : batches.length === 0 ? (
          <EmptyState
            title={selectedDate ? "No uploads on this date" : "No uploads yet"}
            hint={selectedDate
              ? "Choose another date or clear the filter to see other uploads."
              : "Choose files above and upload them to create your first batch."}
          />
        ) : (
          <>
            <div className="upload-list" aria-live="polite">
              {batches.map((batch, index) => (
                <UploadBatchCard
                  key={batch.id}
                  batch={batch}
                  displayId={index + 1}
                  showUsername
                  avatarUser={user ?? undefined}
                  busyItemIds={busyItemIds}
                  onDelete={(batch, item) => removeRecord(batch, item)}
                  onDeleteMany={(batch, items) => removeRecord(batch, undefined, items)}
                  onPause={(batch, item, paused) => void togglePause(batch, item, paused)}
                />
              ))}
            </div>
            {query.isFetchNextPageError ? (
              <ErrorState message="Could not load more uploads." onRetry={() => void query.fetchNextPage()} />
            ) : query.hasNextPage ? (
              <div ref={sentinel}>{query.isFetchingNextPage ? <Spinner /> : null}</div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
