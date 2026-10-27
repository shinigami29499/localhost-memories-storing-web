import { api, uploadWithProgress } from "../../../services/api";
import { getUploadFile, removeUploadFile } from "./uploadFileStore";
import type { PagedUploadBatches, UploadBatch, UploadItem } from "../types";

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
