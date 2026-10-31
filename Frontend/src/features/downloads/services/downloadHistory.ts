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

export async function listAllDownloadHistory(): Promise<DownloadRecord[]> {
  const records: DownloadRecord[] = [];
  while (true) {
    const page = await listDownloadHistory(records.length, 100);
    records.push(...page.items);
    if (page.items.length === 0 || records.length >= page.totalItems) return records;
  }
}

export async function listAllDownloadBatches(): Promise<DownloadBatch[]> {
  const batches: DownloadBatch[] = [];
  while (true) {
    const page = await api<{ items: DownloadBatch[]; totalItems: number }>(`/api/downloads/batches?offset=${batches.length}&limit=100`);
    batches.push(...page.items);
    if (!page.items.length || batches.length >= page.totalItems) return batches;
  }
}

export function saveDownloadBatch(batch: DownloadBatch) {
  return api<void>(`/api/downloads/batches/${encodeURIComponent(batch.id)}`, { method: "PUT", body: { items: batch.items } });
}
