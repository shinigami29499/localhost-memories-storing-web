import { create } from "zustand";

export type TransferStatus = "queued" | "uploading" | "processing" | "success" | "failed" | "cancelled";

export interface TransferProgress {
  status: TransferStatus;
  loaded: number;
  total: number;
  speed?: number;
  remaining?: number;
  error?: string;
}

export interface AlbumTransfer extends TransferProgress {
  id: string;
  userId: string;
  albumId: string;
  name: string;
  createdAt: string;
  completedAt?: string;
  file?: File;
}

export function measureUpload(total: number, update: (progress: TransferProgress) => void) {
  let started = performance.now();
  let previous = 0;
  return (loaded: number, transferred: boolean) => {
    if (loaded < previous) started = performance.now();
    previous = loaded;
    const elapsed = (performance.now() - started) / 1000;
    const speed = loaded > 0 && elapsed >= 0.25 ? loaded / elapsed : undefined;
    update({
      status: transferred ? "processing" : "uploading",
      loaded,
      total,
      speed,
      remaining: !transferred && speed ? (total - loaded) / speed : undefined,
    });
  };
}

export const useUploadProgress = create<{ transfers: Record<string, AlbumTransfer> }>(() => ({ transfers: {} }));

export function trackUpload(transfer: AlbumTransfer) {
  useUploadProgress.setState(({ transfers }) => ({ transfers: { ...transfers, [transfer.id]: transfer } }));
}

export function updateUpload(id: string, update: Partial<AlbumTransfer>) {
  const transfer = useUploadProgress.getState().transfers[id];
  if (transfer) trackUpload({ ...transfer, ...update });
}

export function forgetUpload(id: string) {
  useUploadProgress.setState(({ transfers }) => {
    const next = { ...transfers };
    delete next[id];
    return { transfers: next };
  });
}
