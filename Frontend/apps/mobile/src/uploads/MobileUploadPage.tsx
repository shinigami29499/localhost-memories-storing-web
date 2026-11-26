import { EmptyState } from "@/components/ui/Status";
import { MobileConfirmationDialog as ConfirmationDialog } from "../gallery/MobileConfirmationDialog";
import { UploadHistoryRow } from "@/features/uploads/components/UploadHistoryRows";
import { useUploadManagement } from "@/pages/uploads/useUploadManagement";

export function MobileUploadPage() {
  const { t, ids, deleteTarget, setDeleteTarget, confirmDelete } = useUploadManagement();
  return (
    <main className="local-upload-history" aria-label={t("Upload history")}>
      {ids.length ? (
        <div className="local-upload-history__list" role="list">
          {ids.map((id) => <UploadHistoryRow key={id} id={id} onDelete={(id, name) => setDeleteTarget({ id, name })} />)}
        </div>
      ) : <EmptyState title="No uploads yet" hint="Open an album to upload images or videos." />}
      {deleteTarget && <ConfirmationDialog title="Delete record" confirmLabel="Delete record" danger
        onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete}>
        <p>{t("Delete the record for {filename}?", { filename: deleteTarget.name })}</p>
      </ConfirmationDialog>}
    </main>
  );
}
