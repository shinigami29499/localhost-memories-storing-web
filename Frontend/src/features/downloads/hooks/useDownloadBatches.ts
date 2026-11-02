import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { useDownloadStore, type DownloadBatch } from "../services/downloadQueue";
import { listAllDownloadBatches, listAllDownloadHistory } from "../services/downloadHistory";

export function useDownloadBatches() {
  const user = useAuthStore((state) => state.user);
  const batches = useDownloadStore((state) => state.batches.filter((batch) => batch.userId === user?.id));
  const query = useQuery({ queryKey: ["download-history", user?.id], queryFn: listAllDownloadHistory, enabled: Boolean(user?.id) });
  const batchesQuery = useQuery({ queryKey: ["download-batches", user?.id], queryFn: listAllDownloadBatches, enabled: Boolean(user?.id) });
  const grouped = new Map<string, NonNullable<typeof query.data>>();
  for (const record of query.data ?? []) {
    const key = record.batchId ? `${record.userId}:${record.batchId}` : record.id;
    const group = grouped.get(key) ?? [];
    group.push(record);
    grouped.set(key, group);
  }
  const history: DownloadBatch[] = [...grouped.values()].map((records) => {
    const first = records[0];
    const uniqueRecords = [...new Map(records.map((record) => [record.mediaId, record])).values()];
    return {
      id: first.batchId ?? first.id,
      createdAt: records[records.length - 1].createdAt,
      viewedAt: records[records.length - 1].createdAt,
      username: first.username,
      userId: first.userId,
      items: uniqueRecords.map((record) => ({
        id: record.id, mediaId: record.mediaId, originalFilename: record.originalFilename,
        fileSizeBytes: 0, includeDeleted: false, status: "Failed" as const, loaded: 0,
      })),
    };
  });
  const savedBatches = (batchesQuery.data ?? []).map((batch) => ({
    ...batch,
    items: batch.items.map((item) => item.status === "Recorded"
      ? { ...item, status: "Failed" as const, loaded: 0 }
      : item.status === "Pending" || item.status === "Downloading"
        ? { ...item, status: "Cancelled" as const, loaded: 0 }
        : item),
  }));
  const mergedLocalBatches = batches.map((batch) => {
    const saved = savedBatches.find((entry) => entry.id === batch.id);
    return saved?.viewedAt ? { ...batch, viewedAt: saved.viewedAt } : batch;
  });
  const mergedBatches = [...mergedLocalBatches, ...savedBatches.filter((batch) => !batches.some((current) => current.id === batch.id)),
    ...history.filter((batch) => !batches.some((current) => current.id === batch.id) && !savedBatches.some((saved) => saved.id === batch.id))]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return { batches, query, batchesQuery, mergedBatches };
}
