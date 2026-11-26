import { useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { useUploadHistoryIds } from "../../features/uploads/components/UploadHistoryRows";
import { deleteUploadHistory } from "../../features/uploads/services/uploadRuntime";

export function useUploadManagement() {
  const { t } = useLocale();
  const ids = useUploadHistoryIds();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteUploadHistory(deleteTarget.id);
    setDeleteTarget(null);
  };
  return { t, ids, deleteTarget, setDeleteTarget, confirmDelete };
}
