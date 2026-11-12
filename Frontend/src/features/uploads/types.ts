export type UploadItemStatus = "Pending" | "Uploading" | "Success" | "Failed" | "Cancelled" | "Paused";
export type UploadBatchStatus = "Pending" | "Uploading" | "Cancelled" | "Failed" | "Completed" | "Paused";

export interface UploadItem {
  id: string;
  uploadBatchId: string;
  originalFilename: string;
  contentType: string;
  fileSizeBytes: number;
  status: UploadItemStatus;
  progressPercent: number;
  errorDetails: string | null;
  completedAt: string | null;
}

export interface UploadBatch {
  id: string;
  status: UploadBatchStatus;
  username: string | null;
  canManage: boolean;
  createdAt: string;
  completedAt: string | null;
  viewedAt?: string | null;
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  cancelledFiles: number;
  items: UploadItem[];
}

export interface PagedUploadBatches {
  totalItems: number;
  items: UploadBatch[];
}

export interface UploadItemMetadata {
  id: string;
  originalFilename: string;
  contentType: string;
  fileSizeBytes: number;
}
