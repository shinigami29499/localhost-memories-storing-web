// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../context/LocaleContext";
import { UploadBatchCard } from "./UploadBatchCard";
import type { UploadBatch, UploadBatchStatus, UploadItem } from "../types";

const items: UploadItem[] = [
  {
    id: "failed",
    uploadBatchId: "batch",
    originalFilename: "failed.png",
    contentType: "image/png",
    fileSizeBytes: 1200,
    status: "Failed",
    progressPercent: 70,
    errorDetails: "Network error",
    retryCount: 1,
    completedAt: "2026-10-28T00:01:00Z",
  },
  {
    id: "uploading",
    uploadBatchId: "batch",
    originalFilename: "uploading.mp4",
    contentType: "video/mp4",
    fileSizeBytes: 5000,
    status: "Uploading",
    progressPercent: 45,
    errorDetails: null,
    retryCount: 0,
    completedAt: null,
  },
  {
    id: "pending",
    uploadBatchId: "batch",
    originalFilename: "pending.webp",
    contentType: "image/webp",
    fileSizeBytes: 2000,
    status: "Pending",
    progressPercent: 0,
    errorDetails: null,
    retryCount: 0,
    completedAt: null,
  },
  {
    id: "success",
    uploadBatchId: "batch",
    originalFilename: "success.jpg",
    contentType: "image/jpeg",
    fileSizeBytes: 1000,
    status: "Success",
    progressPercent: 100,
    errorDetails: null,
    retryCount: 0,
    completedAt: "2026-10-28T00:01:00Z",
  },
];

const batch: UploadBatch = {
  id: "batch",
  status: "Uploading",
  username: null,
  canManage: true,
  createdAt: "2026-10-28T00:00:00Z",
  completedAt: null,
  totalFiles: items.length,
  successfulFiles: 1,
  failedFiles: 1,
  cancelledFiles: 0,
  items,
};

describe("UploadBatchCard", () => {
  let container: HTMLDivElement;
  let root: Root;
  let onRetry: ReturnType<typeof vi.fn>;
  const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })));
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() })),
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    onRetry = vi.fn();
    await act(async () => {
      root.render(
        <LocaleProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AnimateUIProvider reducedMotion="never">
              <UploadBatchCard
                batch={batch}
                showUsername={false}
                busyItemIds={new Set()}
                onRetry={onRetry}
              />
            </AnimateUIProvider>
          </MemoryRouter>
        </LocaleProvider>,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
    else Reflect.deleteProperty(Element.prototype, "animate");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function renderBatches(batches: UploadBatch[]) {
    await act(async () => {
      root.render(
        <LocaleProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AnimateUIProvider reducedMotion="never">
              {batches.map((nextBatch) => (
                <UploadBatchCard
                  key={nextBatch.id}
                  batch={nextBatch}
                  showUsername={false}
                  busyItemIds={new Set()}
                  onRetry={onRetry}
                />
              ))}
            </AnimateUIProvider>
          </MemoryRouter>
        </LocaleProvider>,
      );
    });
  }

  it("pages each batch independently in groups of five and preserves file actions", async () => {
    const pagedItems = Array.from({ length: 11 }, (_, index) => ({
      ...items[0],
      id: `file-${index}`,
      originalFilename: `file-${index}.png`,
    }));
    const firstBatch = { ...batch, items: pagedItems, totalFiles: pagedItems.length };
    const secondBatch = { ...firstBatch, id: "second-batch", items: pagedItems.slice(0, 6), totalFiles: 6 };
    await renderBatches([firstBatch, secondBatch]);
    const [first, second] = container.querySelectorAll(".upload-batch");
    for (const card of [first, second]) {
      expect(card.querySelectorAll(".pagination")).toHaveLength(1);
      expect(card.querySelector(".pagination")?.parentElement?.className).toBe("upload-batch__panel");
      expect(card.querySelector(".upload-item .pagination")).toBeNull();
    }
    const filenames = (card: Element) =>
      Array.from(card.querySelectorAll(".upload-item__name"), (name) => name.textContent);
    expect(filenames(first)).toEqual(pagedItems.slice(0, 5).map((item) => item.originalFilename));
    expect(filenames(second)).toHaveLength(5);
    expect(container.querySelector('[aria-label="Items per page"]')).toBeNull();
    expect(first.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')?.disabled).toBe(true);

    await act(async () => first.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click());
    expect(filenames(first)).toEqual(pagedItems.slice(5, 10).map((item) => item.originalFilename));
    expect(second.querySelector('[aria-current="page"]')?.textContent).toBe("1");
    expect(filenames(second)).toEqual(pagedItems.slice(0, 5).map((item) => item.originalFilename));
    await act(async () => first.querySelector<HTMLButtonElement>('[aria-label="Retry file-5.png"]')!.click());
    expect(onRetry).toHaveBeenCalledWith(firstBatch, pagedItems[5]);

    await act(async () => first.querySelector<HTMLButtonElement>(".upload-batch__toggle")!.click());
    await act(async () => first.querySelector<HTMLButtonElement>(".upload-batch__toggle")!.click());
    expect(first.querySelector('[aria-current="page"]')?.textContent).toBe("2");

    await act(async () => first.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click());
    expect(filenames(first)).toEqual(["file-10.png"]);
    expect(first.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(true);
    await act(async () => first.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')!.click());
    expect(filenames(first)).toHaveLength(5);

    await renderBatches([{ ...firstBatch, items: pagedItems.slice(0, 6) }, secondBatch]);
    expect(first.querySelector('[aria-current="page"]')?.textContent).toBe("2");
    expect(filenames(first)).toEqual(["file-5.png"]);
    await renderBatches([{ ...firstBatch, items: pagedItems.slice(0, 5) }, secondBatch]);
    expect(filenames(first)).toHaveLength(5);
    expect(first.querySelector(".pagination")).toBeNull();
  });

  it.each([0, 5])("does not show file pagination for %i files", async (count) => {
    const smallItems = Array.from({ length: count }, (_, index) => ({ ...items[0], id: `file-${index}` }));
    await renderBatches([{ ...batch, items: smallItems, totalFiles: count }]);
    expect(container.querySelectorAll(".upload-item")).toHaveLength(count);
    expect(container.querySelector(".pagination")).toBeNull();
  });

  it("shows progress and only retries failed items", async () => {
    expect(container.querySelector(".upload-item__controls")?.textContent).toContain("70%");
    expect(container.querySelector('[aria-label="Retry failed.png"]')).not.toBeNull();
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Retry success.jpg"]')?.disabled).toBe(true);
    expect(container.textContent).toContain("45%");
    expect(container.textContent).toContain("100%");
    expect(container.textContent).not.toContain("Batch status");
    expect(container.textContent).not.toContain("Item status");
    expect(container.querySelectorAll(".upload-item__file-type")).toHaveLength(items.length);
    expect(container.querySelectorAll(".upload-item__progress-row .upload-progress")).toHaveLength(items.length);
    for (const action of container.querySelectorAll(".upload-item .upload-item__action")) {
      expect(action.closest(".upload-item__controls")).not.toBeNull();
    }

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Retry failed.png"]')!.click();
    });
    expect(onRetry).toHaveBeenCalledWith(batch, items[0]);
  });

  it("places the expand control first in the summary without summary counters", () => {
    expect(container.querySelector(".upload-batch__summary")?.firstElementChild?.className).toBe("upload-batch__toggle");
    expect(container.querySelector(".upload-batch__counts")).toBeNull();
    expect(container.querySelector(".upload-batch__summary")?.textContent).not.toContain("Succeeded");
  });

  it("places the batch status below its label in the compact summary", () => {
    const field = container.querySelector(".upload-batch__status-field")!;
    expect(Array.from(field.children, (child) => child.className)).toEqual([
      "upload-batch__label",
      "upload-status upload-status--uploading",
    ]);
    expect(field.firstElementChild?.textContent).toBe("Status");
    expect(field.lastElementChild?.textContent).toBe("Uploading");
  });

  it.each([0, 17, 40])("shows batch progress as %i of 40 files without the batch GUID", async (successfulFiles) => {
    const id = "12345678-1234-1234-1234-123456789abc";
    await act(async () => {
      root.render(
        <LocaleProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AnimateUIProvider reducedMotion="never">
              <UploadBatchCard
                batch={{ ...batch, id, totalFiles: 40, successfulFiles }}
                showUsername={false}
                busyItemIds={new Set()}
                onRetry={onRetry}
              />
            </AnimateUIProvider>
          </MemoryRouter>
        </LocaleProvider>,
      );
    });
    const progressField = container.querySelector(".upload-batch__progress-field")!;
    expect(progressField.querySelector(".upload-batch__label")?.textContent).toBe("Batch progress");
    expect(progressField.querySelector(".upload-progress__value")?.textContent?.trim()).toBe(`${successfulFiles}/40`);
    expect(progressField.querySelector(".upload-progress__value")?.textContent).not.toContain("%");
    expect(container.querySelector(".upload-batch__files-field")).toBeNull();
    expect(progressField.querySelector('[aria-valuetext]')?.getAttribute("aria-valuetext")).toBe(`${successfulFiles}/40`);
    expect(container.querySelector(".upload-batch__id")).toBeNull();
    expect(container.textContent).not.toContain(id);
    expect(container.querySelector(".upload-batch__caption")).toBeNull();
  });

  it("collapses and expands active files without losing their progress", async () => {
    const toggle = container.querySelector<HTMLButtonElement>(".upload-batch__toggle")!;
    const panel = container.querySelector<HTMLDivElement>(".upload-batch__panel")!;
    expect(toggle.getAttribute("aria-label")).toBe("Hide files");
    expect(toggle.textContent).toBe("");
    expect(toggle.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.hidden).toBe(false);

    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hasAttribute("inert")).toBe(true);

    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hidden).toBe(false);
    expect(panel.querySelector(".upload-item__controls")?.textContent).toContain("70%");
  });

  it.each<UploadBatchStatus>(["Completed", "Failed", "Cancelled"])(
    "expands previous %s batches to show file history",
    async (status) => {
      await act(async () => {
        root.render(
          <LocaleProvider>
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AnimateUIProvider reducedMotion="never">
                <UploadBatchCard
                  key="previous"
                  batch={{ ...batch, status }}
                  showUsername={false}
                  busyItemIds={new Set()}
                  onRetry={onRetry}
                />
              </AnimateUIProvider>
            </MemoryRouter>
          </LocaleProvider>,
        );
      });
      const toggle = container.querySelector<HTMLButtonElement>(".upload-batch__toggle")!;
      const panel = container.querySelector<HTMLDivElement>(".upload-batch__panel")!;
      expect(toggle.getAttribute("aria-label")).toBe("View history");
      expect(toggle.title).toBe("View history");
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(panel.hasAttribute("inert")).toBe(true);
      expect(container.querySelector(".upload-status")?.textContent).toBe(
        status,
      );

      await act(async () => toggle.click());
      expect(toggle.getAttribute("aria-label")).toBe("Hide history");
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(panel.hidden).toBe(false);
      expect(panel.textContent).toContain("Network error");
      expect(panel.textContent).toContain("Retries: 1");
      expect(panel.textContent).toContain("success.jpg");

      await act(async () => toggle.click());
      expect(panel.hasAttribute("inert")).toBe(true);
    },
  );

  it("protects successful records and orders item controls", async () => {
    const onPause = vi.fn();
    const onDelete = vi.fn();
    await act(async () => root.render(
      <LocaleProvider><MemoryRouter><AnimateUIProvider reducedMotion="never">
        <UploadBatchCard batch={batch} showUsername={false} busyItemIds={new Set()} onRetry={onRetry} onRetryAll={vi.fn()} onPause={onPause} onDelete={onDelete} />
      </AnimateUIProvider></MemoryRouter></LocaleProvider>,
    ));
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Delete batch record"]')?.disabled).toBe(false);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Delete record: success.jpg"]')?.disabled).toBe(true);
    const failed = container.querySelector('[aria-label="failed.png"]')!;
    const labels = [...failed.querySelectorAll(".upload-item__actions button")].map((button) => button.getAttribute("aria-label"));
    expect(labels.slice(0, 3)).toEqual(["Retry failed.png", "Pause failed.png", "Delete record: failed.png"]);
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Pause uploading.mp4"]')!.click();
      container.querySelector<HTMLButtonElement>('[aria-label="Delete record: failed.png"]')!.click();
    });
    expect(onPause).toHaveBeenCalledWith(batch, items[1], true);
    expect(onDelete).not.toHaveBeenCalled();
    const dialog = document.querySelector('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain("failed.png");
    expect(dialog.textContent).toContain("cannot be restored");
    await act(async () => {
      Array.from(dialog.querySelectorAll("button")).find((button) => button.textContent === "Delete record")!.click();
    });
    expect(onDelete).toHaveBeenCalledWith(batch, items[0]);
  });

  it("cancels batch deletion without deleting records", async () => {
    const onDelete = vi.fn();
    await act(async () => root.render(
      <LocaleProvider><MemoryRouter><AnimateUIProvider reducedMotion="never">
        <UploadBatchCard batch={batch} showUsername={false} busyItemIds={new Set()} onRetry={onRetry} onDelete={onDelete} />
      </AnimateUIProvider></MemoryRouter></LocaleProvider>,
    ));
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Delete batch record"]')!.click());
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
    const dialog = document.querySelector('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain("Delete 4 file records");
    const cancel = Array.from(dialog.querySelectorAll("button")).find((button) => button.textContent === "Cancel")!;
    expect(document.activeElement).toBe(cancel);
    await act(async () => cancel.click());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("keeps failed record deletion open for retry", async () => {
    const onDelete = vi.fn().mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValue(undefined);
    await act(async () => root.render(
      <LocaleProvider><MemoryRouter><AnimateUIProvider reducedMotion="never">
        <UploadBatchCard batch={batch} showUsername={false} busyItemIds={new Set()} onRetry={onRetry} onDelete={onDelete} />
      </AnimateUIProvider></MemoryRouter></LocaleProvider>,
    ));
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Delete record: failed.png"]')!.click());
    const confirm = Array.from(document.querySelectorAll('[role="alertdialog"] button'))
      .find((button) => button.textContent === "Delete record") as HTMLButtonElement;
    await act(async () => confirm.click());
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    await act(async () => confirm.click());
    expect(onDelete).toHaveBeenCalledTimes(2);
  });

  it("confirms only the selected record snapshot", async () => {
    const onDelete = vi.fn();
    const onDeleteMany = vi.fn();
    await act(async () => root.render(
      <LocaleProvider><MemoryRouter><AnimateUIProvider reducedMotion="never">
        <UploadBatchCard batch={batch} showUsername={false} busyItemIds={new Set()} onRetry={onRetry} onDelete={onDelete} onDeleteMany={onDeleteMany} />
      </AnimateUIProvider></MemoryRouter></LocaleProvider>,
    ));
    await act(async () => {
      container.querySelector<HTMLInputElement>('[aria-label="Select failed.png"]')!.click();
      container.querySelector<HTMLInputElement>('[aria-label="Select pending.webp"]')!.click();
    });
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Delete batch record"]')!.click());
    expect(onDeleteMany).not.toHaveBeenCalled();
    const dialog = document.querySelector('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain("Delete 2 file records");
    await act(async () => container.querySelector<HTMLInputElement>('[aria-label="Select uploading.mp4"]')!.click());
    await act(async () => {
      Array.from(dialog.querySelectorAll("button")).find((button) => button.textContent === "Delete selected records")!.click();
    });
    expect(onDeleteMany).toHaveBeenCalledWith(batch, [items[0], items[2]]);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("keeps busy actions disabled beside progress and hides actions for read-only batches", async () => {
    const renderCard = (canManage: boolean) => (
      <LocaleProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AnimateUIProvider reducedMotion="never">
            <UploadBatchCard
              batch={{ ...batch, canManage }}
              showUsername={false}
              busyItemIds={new Set(["failed"])}
              onRetry={onRetry}
            />
          </AnimateUIProvider>
        </MemoryRouter>
      </LocaleProvider>
    );
    await act(async () => root.render(renderCard(true)));
    const retry = container.querySelector<HTMLButtonElement>('[aria-label="Retry failed.png"]')!;
    expect(retry.disabled).toBe(true);
    expect(retry.getAttribute("aria-busy")).toBe("true");
    expect(retry.querySelector(".btn__spinner")).not.toBeNull();
    expect(retry.closest(".upload-item__controls")).not.toBeNull();

    await act(async () => root.render(renderCard(false)));
    expect(container.querySelector(".upload-item__action")).toBeNull();
  });

  it("localizes upload statuses and history controls in Vietnamese", async () => {
    const previousLanguage = localStorage.getItem("shinigacim.language");
    localStorage.setItem("shinigacim.language", "vi");
    try {
      await act(async () => {
        root.render(
          <LocaleProvider key="vietnamese">
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AnimateUIProvider reducedMotion="never">
                <UploadBatchCard
                  batch={{ ...batch, status: "Failed" }}
                  showUsername={false}
                  busyItemIds={new Set()}
                  onRetry={onRetry}
                />
              </AnimateUIProvider>
            </MemoryRouter>
          </LocaleProvider>,
        );
      });
      expect(container.querySelector(".upload-status")?.textContent).toBe("Thất bại");
      const toggle = container.querySelector<HTMLButtonElement>(".upload-batch__toggle")!;
      expect(toggle.getAttribute("aria-label")).toBe("Xem lịch sử");
      await act(async () => toggle.click());
      expect(toggle.getAttribute("aria-label")).toBe("Ẩn lịch sử");
      expect(container.querySelector(".upload-status--pending")?.textContent).toBe("Đang chờ");
      expect(container.querySelector(".upload-status--uploading")?.textContent).toBe("Đang tải lên");
      expect(container.querySelector(".upload-status--success")?.textContent).toBe("Thành công");
    } finally {
      if (previousLanguage === null) localStorage.removeItem("shinigacim.language");
      else localStorage.setItem("shinigacim.language", previousLanguage);
    }
  });

  it("exposes admin owner as a labelled field", async () => {
    await act(async () => {
      root.render(
        <LocaleProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AnimateUIProvider reducedMotion="never">
              <UploadBatchCard
                batch={{ ...batch, username: "OwnerName" }}
                showUsername
                busyItemIds={new Set()}
                onRetry={vi.fn()}
              />
            </AnimateUIProvider>
          </MemoryRouter>
        </LocaleProvider>,
      );
    });
    expect(container.textContent).toContain("Username");
    expect(container.textContent).toContain("OwnerName");
  });
});
