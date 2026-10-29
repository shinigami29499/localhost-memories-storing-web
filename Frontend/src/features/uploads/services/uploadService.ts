import { api, uploadWithProgress } from "../../../services/api";
import { getUploadFile, removeUploadFile, saveUploadFile } from "./uploadFileStore";
import { wakeUploadRuntime } from "./uploadRuntime";
import type { PagedUploadBatches, UploadBatch, UploadItem } from "../types";
import type { UploadItemMetadata } from "../types";

const BASE_PATH = "/api/uploads";

export const uploadService = {
  list(offset = 0, limit = 20): Promise<PagedUploadBatches> {
    return api(`${BASE_PATH}/batches?offset=${offset}&limit=${limit}`);
  },

  listAll(offset = 0, limit = 20): Promise<PagedUploadBatches> {
    return api(`${BASE_PATH}/admin/batches?offset=${offset}&limit=${limit}`);
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
