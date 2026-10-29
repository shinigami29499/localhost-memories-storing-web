import { ApiError } from "../../../services/api";
import { showToast } from "../../../components/ui";
import { useUploadNotificationStore } from "../../notifications/uploadNotificationStore";
import { getUploadFile, removeUploadFile } from "./uploadFileStore";
import { uploadService } from "./uploadService";
import type { UploadBatch, UploadItem } from "../types";

interface RetryRequest {
  batchId: string;
  itemId: string;
}

const retryRequests = new Map<string, RetryRequest>();
const activeRequests = new Map<string, AbortController>();
const notifiedBatches = new Set<string>();
const wakeRunners = new Set<() => void>();

export function wakeUploadRuntime(): void {
  for (const wake of wakeRunners) wake();
}

export function requestUploadRetry(batchId: string, itemId: string): void {
  retryRequests.set(itemId, { batchId, itemId });
  wakeUploadRuntime();
}

export async function cancelRunningUpload(batchId: string, itemId: string): Promise<UploadItem> {
  const item = await uploadService.cancel(batchId, itemId);
  activeRequests.get(itemId)?.abort();
  retryRequests.delete(itemId);
  wakeUploadRuntime();
  try {
    await removeUploadFile(itemId);
  } catch (error) {
    console.error("Cancelled upload remains in local browser storage.", error);
  }
  return item;
}

export function startUploadRuntime(
  userId: string,
  translate: (key: string, values?: Record<string, string | number>) => string,
  onMediaChanged: () => void,
): () => void {
  const controller = new AbortController();
  let wake: (() => void) | undefined;
  let changeVersion = 0;

  const wait = (milliseconds?: number, observedVersion = changeVersion) => new Promise<void>((resolve) => {
    if (controller.signal.aborted || observedVersion !== changeVersion) {
      resolve();
      return;
    }
    const timer = milliseconds === undefined ? undefined : window.setTimeout(done, milliseconds);
    function done() {
      if (timer !== undefined) window.clearTimeout(timer);
      controller.signal.removeEventListener("abort", done);
      wake = undefined;
      resolve();
    }
    wake = done;
    controller.signal.addEventListener("abort", done, { once: true });
  });

  const reportBatch = (batch: UploadBatch) => {
    const key = `shinigacim.upload-notified.${userId}.${batch.id}`;
    if (notifiedBatches.has(key) || localStorage.getItem(key)) return;
    notifiedBatches.add(key);
    localStorage.setItem(key, "1");

    const summary = translate("{success} succeeded, {failed} failed, {cancelled} cancelled.", {
      success: batch.successfulFiles,
      failed: batch.failedFiles,
      cancelled: batch.cancelledFiles,
    });
    if (batch.status === "Completed") {
      if (window.location.pathname === "/") {
        showToast.success(translate("Upload batch completed"), summary);
      } else {
        useUploadNotificationStore.getState().add(userId, batch);
      }
    } else if (batch.status === "Cancelled") {
      showToast.info(translate("Upload batch cancelled"), summary);
    } else {
      showToast.error(translate("Upload batch finished with issues"), summary);
    }
  };

  const run = async () => {
    const observedBatches = new Set<string>();
    let hasLoadedActive = false;

    let recovered = false;
    while (!recovered && !controller.signal.aborted) {
      try {
        await uploadService.recover();
        recovered = true;
      } catch (error) {
        console.error("Could not recover interrupted uploads.", error);
        await wait(3000);
      }
    }

    while (!controller.signal.aborted) {
      const observedVersion = changeVersion;
      try {
        const activeBatches = await uploadService.active();
        const activeIds = new Set(activeBatches.map((batch) => batch.id));

        if (hasLoadedActive) {
          for (const batchId of observedBatches) {
            if (activeIds.has(batchId)) continue;
            const batch = await uploadService.get(batchId);
            if (batch.completedAt) reportBatch(batch);
            observedBatches.delete(batchId);
          }
        }

        for (const batch of activeBatches) observedBatches.add(batch.id);
        hasLoadedActive = true;

        const retry = retryRequests.values().next().value as RetryRequest | undefined;
        if (retry) {
          retryRequests.delete(retry.itemId);
          observedBatches.add(retry.batchId);
          const processed = await processItem(retry.batchId, retry.itemId, controller.signal);
          if (!processed) await wait(1500, observedVersion);
          continue;
        }

        const pending = await uploadService.queue();
        const next = pending[0];
        if (next) {
          observedBatches.add(next.uploadBatchId);
          const processed = await processItem(next.uploadBatchId, next.id, controller.signal);
          if (!processed) await wait(1500, observedVersion);
          continue;
        }

        await wait(undefined, observedVersion);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Upload watcher could not refresh upload state.", error);
          await wait(3000, observedVersion);
        }
      }
    }
  };

  const runWithLock = async () => {
    if (navigator.locks) {
      while (!controller.signal.aborted) {
        let acquired = false;
        try {
          await navigator.locks.request(
            `shinigacim.upload-runtime.${userId}`,
            { ifAvailable: true },
            async (lock) => {
              if (!lock || controller.signal.aborted) return;
              acquired = true;
              await run();
            },
          );
        } catch (error) {
          if (!controller.signal.aborted) console.error("Upload watcher could not acquire its browser lock.", error);
        }
        if (acquired || controller.signal.aborted) return;
        await wait(3000);
      }
    } else {
      await run();
    }
  };

  const handleChange = () => {
    changeVersion++;
    wake?.();
  };
  wakeRunners.add(handleChange);
  void runWithLock();

  return () => {
    controller.abort();
    for (const active of activeRequests.values()) active.abort();
    activeRequests.clear();
    retryRequests.clear();
    wake?.();
    wakeRunners.delete(handleChange);
  };

  async function processItem(batchId: string, itemId: string, signal: AbortSignal): Promise<boolean> {
    if (signal.aborted) return false;

    try {
      await uploadService.start(batchId, itemId);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 409)) {
        console.error("Could not start the upload item.", error);
      }
      return false;
    }

    let file: File | undefined;
    try {
      file = await getUploadFile(itemId);
    } catch (error) {
      console.error("Could not read the file for upload.", error);
    }

    if (!file) {
      try {
        await uploadService.fail(
          batchId,
          itemId,
          "The file is no longer available on this device. Select it again before retrying.",
        );
      } catch (error) {
        console.error("Could not mark the missing upload file as failed.", error);
      }
      return true;
    }

    const itemController = new AbortController();
    const abortFromRuntime = () => itemController.abort();
    signal.addEventListener("abort", abortFromRuntime, { once: true });
    activeRequests.set(itemId, itemController);

    let lastReportedPercent = -1;
    let lastReportedAt = 0;
    try {
      await uploadService.upload(
        batchId,
        itemId,
        file,
        (loaded, total) => {
          const percent = Math.min(99, Math.floor((loaded / total) * 100));
          const now = Date.now();
          if (percent === lastReportedPercent
            || (percent - lastReportedPercent < 3 && now - lastReportedAt < 500)) return;
          lastReportedPercent = percent;
          lastReportedAt = now;
          void uploadService.reportProgress(batchId, itemId, percent).catch((error: unknown) => {
            if (error instanceof ApiError && error.status === 409) return;
            console.error("Could not persist upload progress.", error);
          });
        },
        itemController.signal,
      );
      onMediaChanged();
      try {
        await removeUploadFile(itemId);
      } catch (error) {
        console.error("Uploaded file remains in local browser storage.", error);
      }
      return true;
    } catch (error) {
      if (itemController.signal.aborted || signal.aborted) return false;

      try {
        const batch = await uploadService.get(batchId);
        const item = batch.items.find((candidate) => candidate.id === itemId);
        if (item?.status === "Success") {
          onMediaChanged();
          await removeUploadFile(itemId);
        } else if (item?.status === "Pending" || item?.status === "Uploading") {
          const message = error instanceof Error ? error.message : "Upload failed.";
          await uploadService.fail(batchId, itemId, message);
        }
      } catch (recordError) {
        console.error("Could not reconcile the failed upload with the server.", recordError);
      }
      return true;
    } finally {
      signal.removeEventListener("abort", abortFromRuntime);
      activeRequests.delete(itemId);
    }
  }
}
