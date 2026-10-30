import { api, uploadWithProgress } from "../../../services/api";
import { getUploadFile, removeUploadFile, saveUploadFile } from "./uploadFileStore";
import { wakeUploadRuntime } from "./uploadRuntime";
import type { PagedUploadBatches, UploadBatch, UploadItem } from "../types";
import type { UploadItemMetadata } from "../types";

const BASE_PATH = "/api/uploads";

function uploadListQuery(offset: number, limit: number, date?: string): string {
  const query = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    query.set("createdFrom", start.toISOString());
    query.set("createdBefore", end.toISOString());
  }
  return query.toString();
}

export const uploadService = {
  list(offset = 0, limit = 20, date?: string): Promise<PagedUploadBatches> {
    return api(`${BASE_PATH}/batches?${uploadListQuery(offset, limit, date)}`);
  },

  listAll(offset = 0, limit = 20, date?: string): Promise<PagedUploadBatches> {
    return api(`${BASE_PATH}/admin/batches?${uploadListQuery(offset, limit, date)}`);
  },

  get(batchId: string): Promise<UploadBatch> {
    return api(`${BASE_PATH}/batches/${batchId}`);
  },

  active(): Promise<UploadBatch[]> {
    return api(`${BASE_PATH}/active`);
  },

  queue(): Promise<UploadItem[]> {
    return api(`${BASE_PATH}/queue`);
  },

  recover(): Promise<void> {
    return api(`${BASE_PATH}/recover`, { method: "POST" });
  },

  async submit(files: File[]): Promise<UploadBatch> {
    const items: UploadItemMetadata[] = files.map((file) => ({
      id: crypto.randomUUID(),
      originalFilename: file.name,
      contentType: file.type || "application/octet-stream",
      fileSizeBytes: file.size,
    }));
    try {
      for (let index = 0; index < items.length; index++) {
        await saveUploadFile(items[index].id, files[index]);
      }
      const batch = await api<UploadBatch>(`${BASE_PATH}/batches`, {
        method: "POST",
        body: { items },
      });
      wakeUploadRuntime();
      return batch;
    } catch (error) {
      for (const item of items) {
        try {
          await removeUploadFile(item.id);
        } catch (cleanupError) {
          console.error("Could not remove a file after its upload submission failed.", cleanupError);
        }
      }
      throw error;
    }
  },

  start(batchId: string, itemId: string): Promise<UploadItem> {
    return api(`${BASE_PATH}/batches/${batchId}/items/${itemId}/start`, { method: "POST" });
  },

  reportProgress(batchId: string, itemId: string, progressPercent: number): Promise<UploadItem> {
    return api(`${BASE_PATH}/batches/${batchId}/items/${itemId}/progress`, {
      method: "POST",
      body: { progressPercent },
    });
  },

  upload(
    batchId: string,
    itemId: string,
    file: File,
    onProgress: (loaded: number, total: number) => void,
    signal: AbortSignal,
  ): Promise<UploadItem> {
    return uploadWithProgress(
      `${BASE_PATH}/batches/${batchId}/items/${itemId}/file`,
      file,
      onProgress,
      signal,
    );
  },

  cancel(batchId: string, itemId: string): Promise<UploadItem> {
    return api(`${BASE_PATH}/batches/${batchId}/items/${itemId}/cancel`, { method: "POST" });
  },

  fail(batchId: string, itemId: string, errorDetails: string): Promise<UploadItem> {
    return api(`${BASE_PATH}/batches/${batchId}/items/${itemId}/fail`, {
      method: "POST",
      body: { errorDetails },
    });
  },

  getFile: getUploadFile,
  removeFile: removeUploadFile,
};
