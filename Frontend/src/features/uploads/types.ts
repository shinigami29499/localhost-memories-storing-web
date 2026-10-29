export type UploadItemStatus = "Pending" | "Uploading" | "Success" | "Failed" | "Cancelled";
export type UploadBatchStatus = "Pending" | "Uploading" | "Cancelled" | "Failed" | "Completed";

export interface UploadItem {
  id: string;
  uploadBatchId: string;
  originalFilename: string;
  contentType: string;
  fileSizeBytes: number;
  status: UploadItemStatus;
  progressPercent: number;
  errorDetails: string | null;
  retryCount: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface UploadBatch {
  id: string;
  postId: string | null;
  caption: string;
  status: UploadBatchStatus;
  username: string | null;
  canManage: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  pendingFiles: number;
  uploadingFiles: number;
  cancelledFiles: number;
  progressPercent: number;
  items: UploadItem[];
}

export interface PagedUploadBatches {
  offset: number;
  limit: number;
  totalItems: number;
  items: UploadBatch[];
}

export interface UploadItemMetadata {
  id: string;
  originalFilename: string;
  contentType: string;
  fileSizeBytes: number;
}
