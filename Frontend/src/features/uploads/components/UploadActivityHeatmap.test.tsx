// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../context/LocaleContext";
import { uploadService } from "../services/uploadService";
import type { UploadBatch } from "../types";
import { useAuthStore } from "../../../store/authStore";
import { UploadActivityHeatmap } from "./UploadActivityHeatmap";

vi.mock("../services/uploadService", () => ({
  uploadService: { list: vi.fn(), listAll: vi.fn() },
}));

function expectedHeatmapCells(weeks: number): number {
  const daysSinceMonday = (new Date().getDay() + 6) % 7;
  return (weeks - 1) * 7 + daysSinceMonday + 1 + 5;
}

const completedAt = new Date().toISOString();
const batch: UploadBatch = {
  id: "batch",
  status: "Completed",
  username: null,
  canManage: true,
  createdAt: completedAt,
  startedAt: completedAt,
  completedAt,
  totalFiles: 1,
  successfulFiles: 1,
  failedFiles: 0,
  pendingFiles: 0,
  uploadingFiles: 0,
  cancelledFiles: 0,
  progressPercent: 100,
  items: [{
    id: "file",
    uploadBatchId: "batch",
    originalFilename: "photo.jpg",
    contentType: "image/jpeg",
    fileSizeBytes: 100,
    status: "Success",
    progressPercent: 100,
    errorDetails: null,
    retryCount: 0,
    startedAt: completedAt,
    completedAt,
  }],
};

describe("UploadActivityHeatmap", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let isMobile: boolean;
  const mediaListeners = new Set<() => void>();

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    isMobile = false;
    mediaListeners.clear();
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: query === "(max-width: 640px)" && isMobile,
      media: query,
      addEventListener: (_event: string, listener: () => void) => mediaListeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => mediaListeners.delete(listener),
    })));
    vi.mocked(uploadService.list).mockResolvedValue({
      offset: 0,
      limit: 100,
      totalItems: 1,
      items: [batch],
    });
    vi.mocked(uploadService.listAll).mockResolvedValue({
      offset: 0,
      limit: 100,
      totalItems: 1,
      items: [batch],
    });
    useAuthStore.setState({
      user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "" },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    useAuthStore.getState().clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const render = async () => act(async () => root.render(
    <QueryClientProvider client={client}>
      <LocaleProvider><UploadActivityHeatmap /></LocaleProvider>
    </QueryClientProvider>,
  ));

  it("shows the successful file count for the last 36 weeks", async () => {
    await render();

    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector(".upload-activity__total")?.textContent).toBe("1 file"));
    });
    expect(container.querySelector('[role="img"]')?.getAttribute("aria-label"))
      .toBe("Upload activity over the last 36 weeks: 1 successful file");
    expect(container.querySelectorAll(".upload-activity__day")).toHaveLength(expectedHeatmapCells(36));
    expect(uploadService.list).toHaveBeenCalledWith(0, 100);
    expect(uploadService.listAll).not.toHaveBeenCalled();
  });

  it("shows 12 weeks on mobile", async () => {
    isMobile = true;
    await render();

    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector(".upload-activity__total")?.textContent).toBe("1 file"));
    });
    expect(container.querySelector('[role="img"]')?.getAttribute("aria-label"))
      .toBe("Upload activity over the last 12 weeks: 1 successful file");
    expect(container.querySelectorAll(".upload-activity__day")).toHaveLength(expectedHeatmapCells(12));
  });

  it("scales the week range when the viewport crosses the mobile breakpoint", async () => {
    await render();

    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector(".upload-activity__total")?.textContent).toBe("1 file"));
    });
    expect(container.querySelectorAll(".upload-activity__day")).toHaveLength(expectedHeatmapCells(36));

    await act(async () => {
      isMobile = true;
      mediaListeners.forEach((listener) => listener());
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[role="img"]')?.getAttribute("aria-label"))
          .toBe("Upload activity over the last 12 weeks: 1 successful file");
      });
    });
    expect(container.querySelectorAll(".upload-activity__day")).toHaveLength(expectedHeatmapCells(12));
  });
});
