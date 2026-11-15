import { useState } from "react";
import { useLocale } from "../../../context/LocaleContext";
import { useAuthStore } from "../../../store/authStore";
import { useUploadNotificationStore } from "../../notifications/uploadNotificationStore";
import { uploadCategory, useUploadReadStore } from "../hooks/useUnreadUploads";
import type { UploadBatch, UploadItem } from "../types";

const ITEMS_PER_PAGE = 5;

export function useUploadBatchCard(
  batch: UploadBatch,
  onDelete?: (batch: UploadBatch, item?: UploadItem) => void | Promise<void>,
  onDeleteMany?: (batch: UploadBatch, items: UploadItem[]) => Promise<void>,
) {
  const { t, language } = useLocale();
  const userId = useAuthStore((state) => state.user?.id) ?? "";
  const read = useUploadReadStore((state) => state.read);
  const markBatchSeenLocally = useUploadReadStore((state) => state.markBatchRead);
  const unreadItems = batch.viewedAt ? [] : batch.items.filter((item) => { const category = uploadCategory(item); return category && read[`${userId}:${item.id}`] !== category; });
  const markBatchRead = () => {
    if (!unreadItems.length) return;
    markBatchSeenLocally(userId, batch.id, unreadItems);
    useUploadNotificationStore.getState().markRead(userId, `upload:${userId}:${batch.id}`);
  };
  const active = batch.status === "Uploading" || batch.status === "Pending";
  const [expanded, setExpanded] = useState(active);
  const [itemPage, setItemPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedItems = batch.items.filter((item) => selectedIds.has(item.id));
  const actionItems = selectedItems.length ? selectedItems : batch.items;
  const [deleteTarget, setDeleteTarget] = useState<{ item?: UploadItem; selected?: UploadItem[] } | null>(null);
  const filteredItems = batch.items;
  const totalItemPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const currentItemPage = Math.min(itemPage, totalItemPages);
  const visibleItems = filteredItems.slice(
    (currentItemPage - 1) * ITEMS_PER_PAGE,
    currentItemPage * ITEMS_PER_PAGE,
  );
  const panelId = `upload-batch-${batch.id}`;
  const progress = batch.totalFiles > 0
    ? Math.max(0, Math.min((batch.successfulFiles / batch.totalFiles) * 100, 100))
    : 0;
  const toggleLabel = active
    ? (expanded ? t("Hide files") : t("View files"))
    : (expanded ? t("Hide history") : t("View history"));

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.selected) {
      if (!onDeleteMany) throw new Error(t("Could not delete upload record."));
      await onDeleteMany(batch, deleteTarget.selected);
      setSelectedIds(new Set());
    } else {
      if (!onDelete) throw new Error(t("Could not delete upload record."));
      await onDelete(batch, deleteTarget.item);
    }
  };
  return { confirmDelete, t, language, unreadItems, markBatchRead, active, expanded, setExpanded, selectedIds, setSelectedIds, selectedItems, actionItems, deleteTarget, setDeleteTarget, filteredItems, currentItemPage, visibleItems, setItemPage, panelId, progress, toggleLabel };
}
