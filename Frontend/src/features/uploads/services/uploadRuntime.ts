import { ApiError } from "../../../services/api";
import { showToast } from "../../../components/ui";
import { showBrowserNotification } from "../../notifications/browserNotifications";
import { useUploadNotificationStore } from "../../notifications/uploadNotificationStore";
import { uploadMessage } from "../../notifications/uploadMessage";
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
const ITEM_INACTIVITY_TIMEOUT_MS = 30_000;
const batchStartAttempts = new Map<string, number>();
const completionActions = new Map<string, (batch: UploadBatch) => Promise<string | void>>();

export function registerUploadCompletionAction(
  batchId: string,
  action: (batch: UploadBatch) => Promise<string | void>,
): void {
  completionActions.set(batchId, action);
}

export function wakeUploadRuntime(): void {
  for (const wake of wakeRunners) wake();
}

export function requestUploadRetry(batchId: string, itemId: string): void {
  retryRequests.set(itemId, { batchId, itemId });
  wakeUploadRuntime();
}

export async function setUploadPaused(batchId: string, itemId: string | undefined, paused: boolean): Promise<void> {
  const batch = await uploadService.setPaused(batchId, itemId, paused);
  if (paused) for (const item of batch.items) {
    if ((!itemId || item.id === itemId) && item.status === "Paused") { activeRequests.get(item.id)?.abort(); retryRequests.delete(item.id); }
  }
  wakeUploadRuntime();
}

export function stopUploadLocally(itemId: string): void {
  activeRequests.get(itemId)?.abort();
  retryRequests.delete(itemId);
  wakeUploadRuntime();
}

export function startUploadRuntime(
  userId: string,
  translate: (key: string, values?: Record<string, string | number>) => string,
  onBatchCompleted: () => void,
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

  const reportBatch = async (batch: UploadBatch) => {
    const key = `shinigacim.upload-notified.${userId}.${batch.id}`;
    if (notifiedBatches.has(key) || localStorage.getItem(key)) return;
    notifiedBatches.add(key);
    localStorage.setItem(key, "1");
    let completionUrl: string | undefined;
    const completionAction = completionActions.get(batch.id);
    completionActions.delete(batch.id);
    if (batch.status === "Completed" && completionAction) {
      try {
        completionUrl = await completionAction(batch) || undefined;
      } catch (error) {
        console.error("Could not finish upload completion action.", error);
      }
    }
    onBatchCompleted();
    showToast.dismiss(`upload-start:${batch.id}`);

    const summary = translate("{success} success, {failed} failed.", {
      success: batch.successfulFiles,
      failed: batch.failedFiles,
    });
    useUploadNotificationStore.getState().add(userId, batch);
    if (batch.status === "Completed") {
      const images = batch.items.filter((item) => item.status === "Success" && item.contentType.startsWith("image/")).length;
      const videos = batch.items.filter((item) => item.status === "Success" && item.contentType.startsWith("video/")).length;
      const title = uploadMessage(translate, images, videos);
      const destination = completionUrl ?? "/sync/upload";
      void showBrowserNotification(title, summary, destination).catch((error: unknown) => {
        console.error("Could not show upload notification.", error);
      });
      showToast.success(title, {
        id: `upload-completed:${batch.id}`,
        description: completionUrl
          ? translate("Click to view on the map.")
          : translate(isGalleryPath(window.location.pathname)
          ? "Click to refresh."
          : "Click to go to gallery."),
        onClick: () => {
          if (completionUrl) window.location.assign(completionUrl);
          else if (isGalleryPath(window.location.pathname)) window.location.reload();
          else window.location.assign("/library/gallery");
        },
      });
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
            if (batch.completedAt) await reportBatch(batch);
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
    batchStartAttempts.clear();
    retryRequests.clear();
    wake?.();
    wakeRunners.delete(handleChange);
  };

  async function processItem(batchId: string, itemId: string, signal: AbortSignal): Promise<boolean> {
    if (signal.aborted) return false;
    const firstAttemptAt = batchStartAttempts.get(batchId) ?? Date.now();
    batchStartAttempts.set(batchId, firstAttemptAt);
    if (Date.now() - firstAttemptAt >= ITEM_INACTIVITY_TIMEOUT_MS) {
      await failBatch(batchId, itemId, "Upload batch did not start within 30 seconds.");
      batchStartAttempts.delete(batchId);
      return true;
    }

    const itemController = new AbortController();
    const abortFromRuntime = () => itemController.abort();
    signal.addEventListener("abort", abortFromRuntime, { once: true });
    activeRequests.set(itemId, itemController);
    let timedOut = false;
    let timeout: number | undefined;
    const resetTimeout = () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        timedOut = true;
        itemController.abort();
      }, ITEM_INACTIVITY_TIMEOUT_MS);
    };
    resetTimeout();

    let lastReportedPercent = -1;
    let lastReportedAt = 0;
    let uploadStarted = false;
    try {
      await uploadService.start(batchId, itemId, itemController.signal);
      uploadStarted = true;
      batchStartAttempts.delete(batchId);
      let file: File | undefined;
      try {
        file = await getUploadFile(itemId);
      } catch (error) {
        console.error("Could not read the file for upload.", error);
      }

      if (!file) {
        await uploadService.fail(
          batchId,
          itemId,
          "The file is no longer available on this device. Select it again before retrying.",
        );
        return true;
      }

      await uploadService.upload(
        batchId,
        itemId,
        file,
        (loaded, total) => {
          resetTimeout();
          const percent = Math.min(99, Math.floor((loaded / total) * 100));
          const now = Date.now();
          if (percent === lastReportedPercent
            || (percent - lastReportedPercent < 3 && now - lastReportedAt < 500)) return;
          lastReportedPercent = percent;
          lastReportedAt = now;
          void uploadService.reportProgress(batchId, itemId, percent).catch((error: unknown) => {
            if (error instanceof ApiError && error.status === 409) {
              itemController.abort();
              return;
            }
            console.error("Could not persist upload progress.", error);
          });
        },
        itemController.signal,
      );
      try {
        await removeUploadFile(itemId);
      } catch (error) {
        console.error("Uploaded file remains in local browser storage.", error);
      }
      return true;
    } catch (error) {
      if (timedOut) {
        if (!uploadStarted) {
          await failBatch(batchId, itemId, "Upload batch did not start within 30 seconds.");
          batchStartAttempts.delete(batchId);
        } else {
          try {
            await uploadService.fail(batchId, itemId, "Upload timed out after 30 seconds without progress.");
          } catch (failError) {
            console.error("Could not mark the timed out upload item as failed.", failError);
          }
        }
        return true;
      }
      if (itemController.signal.aborted || signal.aborted) return false;
      if (!uploadStarted) {
        if (!(error instanceof ApiError && error.status === 409)) {
          console.error("Could not start the upload item.", error);
        }
        return false;
      }

      try {
        const batch = await uploadService.get(batchId);
        const item = batch.items.find((candidate) => candidate.id === itemId);
        if (item?.status === "Success") {
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
      if (timeout !== undefined) window.clearTimeout(timeout);
      signal.removeEventListener("abort", abortFromRuntime);
      activeRequests.delete(itemId);
    }
  }

  async function failBatch(batchId: string, processingItemId: string, message: string) {
    try {
      const batch = await uploadService.get(batchId);
      const activeItems = batch.items.filter((item) => item.status === "Uploading");
      const itemsToFail = activeItems.length > 0
        ? activeItems.filter((item) => item.id === processingItemId)
        : batch.items.filter((item) => item.status === "Pending");
      await Promise.allSettled(itemsToFail
        .map((item) => uploadService.fail(batchId, item.id, message)));
    } catch (error) {
      console.error("Could not fail the timed out upload batch.", error);
    }
  }
}

function isGalleryPath(pathname: string): boolean {
  return pathname === "/library/gallery"
    || pathname === "/library/gallery/videos"
    || pathname === "/library/gallery/favorites";
}
