import type { DownloadBatch } from "./downloadQueue";
import { api } from "../../../services/api";

export interface DownloadRecord {
  id: string;
  mediaId: string;
  batchId: string | null;
  originalFilename: string;
  userId: string;
  username: string;
  createdAt: string;
}

export function listDownloadHistory(offset: number, limit: number) {
  return api<{ items: DownloadRecord[]; totalItems: number }>(`/api/downloads?offset=${offset}&limit=${limit}`);
}

async function listAllPages<T>(loadPage: (offset: number) => Promise<{ items: T[]; totalItems: number }>): Promise<T[]> {
  const records: T[] = [];
  while (true) {
    const page = await loadPage(records.length);
    records.push(...page.items);
    if (page.items.length === 0 || records.length >= page.totalItems) return records;
  }
}

export function listAllDownloadHistory(): Promise<DownloadRecord[]> {
  return listAllPages((offset) => listDownloadHistory(offset, 100));
}

export function listAllDownloadBatches(): Promise<DownloadBatch[]> {
  return listAllPages((offset) => api<{ items: DownloadBatch[]; totalItems: number }>(`/api/downloads/batches?offset=${offset}&limit=100`));
}

export function saveDownloadBatch(batch: DownloadBatch) {
  return api<void>(`/api/downloads/batches/${encodeURIComponent(batch.id)}`, { method: "PUT", body: { items: batch.items } });
}

export function deleteDownloadRecord(batchId: string, itemId?: string) {
  return api<void>(`/api/downloads/batches/${encodeURIComponent(batchId)}${itemId ? `/items/${encodeURIComponent(itemId)}` : ""}`, { method: "DELETE" });
}

export function deleteDownloadRecords(batchId: string, itemIds: string[]) {
  return api<void>(`/api/downloads/batches/${encodeURIComponent(batchId)}/items/delete`, { method: "POST", body: itemIds });
}
