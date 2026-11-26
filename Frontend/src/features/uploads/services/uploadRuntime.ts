import { measureUpload, forgetUpload, trackUpload, updateUpload, useUploadProgress, type AlbumTransfer } from "../uploadProgress";
import { readUploadHistory, removeUploadRecord, saveUploadRecord } from "./uploadFileStore";
import { uploadService } from "./uploadService";

const MAX_ACTIVE_UPLOADS = 3;
const INACTIVITY_TIMEOUT_MS = 30_000;
const runners = new Map<string, () => void>();
const requests = new Map<string, AbortController>();
const cacheWrites = new Map<string, Promise<void>>();

function persist(transfer: AlbumTransfer) {
  const previous = cacheWrites.get(transfer.id) ?? Promise.resolve();
  const write = previous.then(() => saveUploadRecord(transfer))
    .catch((error: unknown) => console.error("Could not save local upload history.", error));
  cacheWrites.set(transfer.id, write);
  void write.then(() => { if (cacheWrites.get(transfer.id) === write) cacheWrites.delete(transfer.id); });
}

function currentUpload(id: string) {
  return useUploadProgress.getState().transfers[id];
}

function saveState(id: string, update: Partial<AlbumTransfer>) {
  updateUpload(id, update);
  const transfer = currentUpload(id);
  if (transfer) persist(transfer);
}

export function queueAlbumUploads(albumId: string, files: File[], userId: string) {
  for (const file of files) {
    const transfer: AlbumTransfer = {
      id: crypto.randomUUID(), albumId, userId, file, name: file.name,
      createdAt: new Date().toISOString(), status: "queued", loaded: 0, total: file.size,
    };
    trackUpload(transfer);
    persist(transfer);
  }
  runners.get(userId)?.();
}

export function cancelUpload(id: string) {
  const transfer = currentUpload(id);
  if (!transfer || !["queued", "uploading", "processing"].includes(transfer.status)) return;
  saveState(id, { status: "cancelled", speed: undefined, remaining: undefined });
  requests.get(id)?.abort();
}

export function retryUpload(id: string) {
  const transfer = currentUpload(id);
  if (!transfer || !["failed", "cancelled"].includes(transfer.status)) return;
  if (!transfer.file) {
    saveState(id, { error: "The file is no longer available on this device." });
    return;
  }
  saveState(id, { status: "queued", loaded: 0, error: undefined, speed: undefined, remaining: undefined });
  runners.get(transfer.userId)?.();
}

export async function deleteUploadHistory(id: string) {
  await cacheWrites.get(id);
  await removeUploadRecord(id);
  forgetUpload(id);
}

export function startUploadRuntime(userId: string, onStored: (transfer: AlbumTransfer) => void, enabled = true): () => void {
  const active = new Map<string, AbortController>();
  let stopped = false;
  const pump = () => {
    if (stopped || !enabled) return;
    for (const transfer of Object.values(useUploadProgress.getState().transfers)) {
      if (active.size >= MAX_ACTIVE_UPLOADS) break;
      if (transfer.userId !== userId || transfer.status !== "queued" || active.has(transfer.id)) continue;
      const controller = new AbortController();
      active.set(transfer.id, controller);
      requests.set(transfer.id, controller);
      void send(transfer, controller).finally(() => {
        active.delete(transfer.id);
        requests.delete(transfer.id);
        pump();
      });
    }
  };

  runners.set(userId, pump);
  void readUploadHistory(userId).then((history) => {
    if (stopped) return;
    for (const transfer of history) {
      if (currentUpload(transfer.id)) continue;
      if (transfer.status === "uploading" || transfer.status === "processing") {
        trackUpload({ ...transfer, status: "failed", error: "Upload was interrupted. Try again." });
      } else {
        trackUpload(transfer);
      }
    }
    pump();
  }).catch((error: unknown) => console.error("Could not read local upload history.", error));
  pump();

  return () => {
    stopped = true;
    if (runners.get(userId) === pump) runners.delete(userId);
    for (const controller of active.values()) controller.abort();
  };

  async function send(transfer: AlbumTransfer, controller: AbortController) {
    const { id, file, albumId } = transfer;
    if (!file) {
      saveState(id, { status: "failed", error: "The file is no longer available on this device." });
      return;
    }
    let timeout: number | undefined;
    let timedOut = false;
    const resetTimeout = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, INACTIVITY_TIMEOUT_MS);
    };

    saveState(id, { status: "uploading" });
    resetTimeout();
    try {
      const progress = measureUpload(file.size, (measurement) => {
        if (controller.signal.aborted) return;
        if (measurement.status === "processing") window.clearTimeout(timeout);
        else resetTimeout();
        updateUpload(id, measurement);
      });
      const result = await uploadService.upload(albumId, id, file, progress, controller.signal);
      if (result?.mediaId !== id) throw new Error("The server did not confirm file storage.");
      saveState(id, { status: "success", loaded: file.size, remaining: undefined, file: undefined,
        completedAt: new Date().toISOString() });
      if (!stopped) onStored(currentUpload(id));
    } catch (error) {
      if (currentUpload(id)?.status === "uploading" || currentUpload(id)?.status === "processing") {
        saveState(id, {
          status: "failed", speed: undefined, remaining: undefined,
          error: timedOut ? "Upload timed out after 30 seconds without progress."
            : stopped ? "Upload was interrupted. Try again."
            : error instanceof Error ? error.message : "Upload failed.",
        });
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }
}
