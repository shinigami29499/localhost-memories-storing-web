import { create } from "zustand";
import { downloadBlob } from "../../../services/api";
import { useAuthStore } from "../../../store/authStore";
import type { MediaFile } from "../../media/types";

export type DownloadStatus = "Pending" | "Downloading" | "Sent to browser" | "Failed" | "Cancelled";

export interface DownloadItem {
  id: string;
  mediaId: string;
  originalFilename: string;
  fileSizeBytes: number;
  includeDeleted: boolean;
  status: DownloadStatus;
  loaded: number;
  error?: string;
}

export interface DownloadBatch {
  id: string;
  createdAt: string;
  items: DownloadItem[];
}

export const useDownloadStore = create<{ batches: DownloadBatch[] }>(() => ({ batches: [] }));

let running = false;
let active: { itemId: string; controller: AbortController } | undefined;
const objectUrls = new Map<string, ReturnType<typeof setTimeout>>();

function updateItem(itemId: string, changes: Partial<DownloadItem>) {
  useDownloadStore.setState((state) => ({
    batches: state.batches.map((batch) => ({
      ...batch,
      items: batch.items.map((item) => item.id === itemId ? { ...item, ...changes } : item),
    })),
  }));
}

function nextItem(): DownloadItem | undefined {
  for (const batch of [...useDownloadStore.getState().batches].reverse()) {
    const item = batch.items.find((candidate) => candidate.status === "Pending");
    if (item) return item;
  }
}

function releaseUrl(url: string) {
  clearTimeout(objectUrls.get(url));
  objectUrls.delete(url);
  URL.revokeObjectURL(url);
}

function sendToBrowser(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Safari may still be reading the object URL after the click returns.
    objectUrls.set(url, setTimeout(() => releaseUrl(url), 60_000));
  }
}

async function runQueue() {
  if (running) return;
  running = true;
  try {
    let item: DownloadItem | undefined;
    while ((item = nextItem())) {
      const { id: itemId } = item;
      const ownerId = useAuthStore.getState().user?.id;
      const controller = new AbortController();
      active = { itemId, controller };
      updateItem(itemId, { status: "Downloading", loaded: 0, error: undefined });
      try {
        const query = item.includeDeleted ? "?includeDeleted=true" : "";
        const blob = await downloadBlob(
          `/api/library/gallery/${encodeURIComponent(item.mediaId)}/file${query}`,
          controller.signal,
          (loaded) => {
            if (!controller.signal.aborted) updateItem(itemId, { loaded });
          },
        );
        controller.signal.throwIfAborted();
        if (!ownerId || useAuthStore.getState().user?.id !== ownerId || !useAuthStore.getState().accessToken) {
          throw new Error("The download session has ended.");
        }
        sendToBrowser(blob, item.originalFilename);
        updateItem(itemId, { status: "Sent to browser", loaded: blob.size });
      } catch (error) {
        if (!controller.signal.aborted) {
          updateItem(itemId, {
            status: "Failed",
            error: error instanceof Error ? error.message : "The download failed.",
          });
        }
      } finally {
        active = undefined;
      }
    }
  } finally {
    running = false;
  }
}

export function enqueueDownloads(media: readonly MediaFile[], includeDeleted = false): string {
  if (!useAuthStore.getState().user || !useAuthStore.getState().accessToken) {
    throw new Error("Sign in to download media.");
  }
  if (media.length === 0) throw new Error("Select media to download.");
  const batch: DownloadBatch = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    items: [...new Map(media.map((item) => [item.id, item])).values()].map((item) => ({
      id: crypto.randomUUID(),
      mediaId: item.id,
      originalFilename: item.originalFilename,
      fileSizeBytes: item.fileSizeBytes,
      includeDeleted,
      status: "Pending",
      loaded: 0,
    })),
  };
  useDownloadStore.setState((state) => ({ batches: [batch, ...state.batches] }));
  void runQueue();
  return batch.id;
}

export function cancelDownload(itemId: string) {
  const item = useDownloadStore.getState().batches.flatMap((batch) => batch.items)
    .find((candidate) => candidate.id === itemId);
  if (!item || (item.status !== "Pending" && item.status !== "Downloading")) return;
  updateItem(itemId, { status: "Cancelled" });
  if (active?.itemId === itemId) active.controller.abort();
}

export function retryDownload(itemId: string) {
  const item = useDownloadStore.getState().batches.flatMap((batch) => batch.items)
    .find((candidate) => candidate.id === itemId);
  if (!item || item.status === "Pending" || item.status === "Downloading") return;
  if (!useAuthStore.getState().user || !useAuthStore.getState().accessToken) {
    throw new Error("Sign in to download media.");
  }
  updateItem(itemId, { status: "Pending", loaded: 0, error: undefined });
  void runQueue();
}

export function clearDownloads() {
  active?.controller.abort();
  useDownloadStore.setState({ batches: [] });
  for (const url of objectUrls.keys()) releaseUrl(url);
}
