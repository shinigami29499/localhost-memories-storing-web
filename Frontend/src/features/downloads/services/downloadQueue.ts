import { create } from "zustand";
import { showToast } from "../../../components/ui/Toast";
import { deleteDownloadRecord, deleteDownloadRecords, saveDownloadBatch } from "./downloadHistory";
import { downloadBlob } from "../../../services/api";
import { useAuthStore } from "../../../store/authStore";
import type { MediaFile } from "../../media/types";

export type DownloadStatus = "Pending" | "Downloading" | "Sent to browser" | "Failed" | "Cancelled" | "Paused" | "Recorded";

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
  username?: string;
  userId?: string;
  items: DownloadItem[];
}

export const useDownloadStore = create<{ batches: DownloadBatch[] }>(() => ({ batches: [] }));

let running = false;
let active: { itemId: string; controller: AbortController } | undefined;
const objectUrls = new Map<string, ReturnType<typeof setTimeout>>();

const pendingSaves = new Map<string, Promise<void>>();

function persistBatch(batch: DownloadBatch) {
  const ownerId = batch.userId;
  const previous = pendingSaves.get(batch.id) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    if (!ownerId || useAuthStore.getState().user?.id !== ownerId || !useAuthStore.getState().accessToken) return;
    const current = useDownloadStore.getState().batches.find((entry) => entry.id === batch.id);
    if (current) await saveDownloadBatch({ ...current, items: current.items.map((item) => ({ ...item })) });
  });
  pendingSaves.set(batch.id, next);
  void next.catch((error: unknown) => {
    showToast.error("Could not save download progress.", error instanceof Error ? error.message : undefined);
  }).finally(() => {
    if (pendingSaves.get(batch.id) === next) pendingSaves.delete(batch.id);
  });
}

function updateItem(itemId: string, changes: Partial<DownloadItem>) {
  useDownloadStore.setState((state) => ({
    batches: state.batches.map((batch) => ({
      ...batch,
      items: batch.items.map((item) => item.id === itemId ? { ...item, ...changes } : item),
    })),
  }));
  if (changes.status) {
    const batch = useDownloadStore.getState().batches.find((entry) => entry.items.some((item) => item.id === itemId));
    if (batch) persistBatch(batch);
  }
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
        const batchId = useDownloadStore.getState().batches.find((batch) => batch.items.some((entry) => entry.id === itemId))?.id;
        const query = new URLSearchParams({ download: "true" });
        if (item.includeDeleted) query.set("includeDeleted", "true");
        if (batchId) query.set("batchId", batchId);
        const blob = await downloadBlob(
          `/api/library/gallery/${encodeURIComponent(item.mediaId)}/file?${query}`,
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

export function enqueueDownloads(media: readonly Pick<MediaFile, "id" | "originalFilename" | "fileSizeBytes">[], includeDeleted = false): string {
  if (!useAuthStore.getState().user || !useAuthStore.getState().accessToken) {
    throw new Error("Sign in to download media.");
  }
  if (media.length === 0) throw new Error("Select media to download.");
  const batch: DownloadBatch = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    username: useAuthStore.getState().user?.username,
    userId: useAuthStore.getState().user?.id,
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
  persistBatch(batch);
  void runQueue();
  return batch.id;
}

export function retryHistoryDownload(batch: DownloadBatch, itemId: string) {
  if (!useAuthStore.getState().user || !useAuthStore.getState().accessToken) {
    throw new Error("Sign in to download media.");
  }
  useDownloadStore.setState((state) => ({
    batches: state.batches.some((entry) => entry.id === batch.id)
      ? state.batches
      : [batch, ...state.batches],
  }));
  retryDownload(itemId);
}

export async function removeDownloadRecord(batch: DownloadBatch, itemId?: string, itemIds?: string[]) {
  const targets = itemIds ? batch.items.filter((item) => itemIds.includes(item.id)) : itemId ? batch.items.filter((item) => item.id === itemId) : batch.items;
  if (targets.some((item) => item.status === "Sent to browser")) throw new Error("Successful downloads cannot be deleted.");
  if (targets.some((item) => item.status === "Pending" || item.status === "Downloading" || item.status === "Paused")) {
    useDownloadStore.setState((state) => ({ batches: state.batches.some((entry) => entry.id === batch.id) ? state.batches : [batch, ...state.batches] }));
    targets.forEach((item) => cancelDownload(item.id));
  }
  const previous = pendingSaves.get(batch.id) ?? Promise.resolve();
  const deletion = previous.then(async () => {
    if (itemIds) await deleteDownloadRecords(batch.id, itemIds);
    else await deleteDownloadRecord(batch.id, itemId);
    useDownloadStore.setState((state) => ({ batches: state.batches.flatMap((entry) => {
      if (entry.id !== batch.id) return [entry];
      if (!itemId && !itemIds) return [];
      const items = entry.items.filter((item) => itemIds ? !itemIds.includes(item.id) : item.id !== itemId);
      return items.length ? [{ ...entry, items }] : [];
    }) }));
  });
  pendingSaves.set(batch.id, deletion);
  try { await deletion; }
  finally { if (pendingSaves.get(batch.id) === deletion) pendingSaves.delete(batch.id); }
}

export function pauseDownloadItem(itemId: string) {
  const item = useDownloadStore.getState().batches.flatMap((batch) => batch.items).find((entry) => entry.id === itemId);
  if (!item || (item.status !== "Pending" && item.status !== "Downloading")) return;
  updateItem(itemId, { status: "Paused", loaded: 0 });
  if (active?.itemId === itemId) active.controller.abort();
}

export function resumeDownloadItem(batch: DownloadBatch, itemId: string) {
  if (!useAuthStore.getState().user || !useAuthStore.getState().accessToken) throw new Error("Sign in to download media.");
  useDownloadStore.setState((state) => ({ batches: state.batches.some((entry) => entry.id === batch.id) ? state.batches : [batch, ...state.batches] }));
  const item = useDownloadStore.getState().batches.flatMap((entry) => entry.items).find((entry) => entry.id === itemId);
  if (item?.status !== "Paused") return;
  updateItem(itemId, { status: "Pending", loaded: 0, error: undefined });
  void runQueue();
}

export function pauseDownloadBatch(batchId: string) {
  const batch = useDownloadStore.getState().batches.find((entry) => entry.id === batchId);
  if (!batch) return;
  for (const item of batch.items) {
    if (item.status === "Pending" || item.status === "Downloading") {
      updateItem(item.id, { status: "Paused", loaded: 0 });
      if (active?.itemId === item.id) active.controller.abort();
    }
  }
}

export function resumeDownloadBatch(batch: DownloadBatch) {
  if (!useAuthStore.getState().user || !useAuthStore.getState().accessToken) throw new Error("Sign in to download media.");
  useDownloadStore.setState((state) => ({
    batches: state.batches.some((entry) => entry.id === batch.id) ? state.batches : [batch, ...state.batches],
  }));
  const current = useDownloadStore.getState().batches.find((entry) => entry.id === batch.id);
  for (const item of current?.items ?? []) {
    if (item.status === "Paused") updateItem(item.id, { status: "Pending", loaded: 0, error: undefined });
  }
  void runQueue();
}

export function cancelDownload(itemId: string) {
  const item = useDownloadStore.getState().batches.flatMap((batch) => batch.items)
    .find((candidate) => candidate.id === itemId);
  if (!item || (item.status !== "Pending" && item.status !== "Downloading" && item.status !== "Paused")) return;
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
