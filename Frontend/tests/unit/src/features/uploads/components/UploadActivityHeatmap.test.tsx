// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../../../../src/context/LocaleContext";
import { useUploadProgress, type AlbumTransfer } from "../../../../../../src/features/uploads/uploadProgress";
import { useAuthStore } from "../../../../../../src/store/authStore";
import { UploadActivityHeatmap } from "../../../../../../src/features/uploads/components/UploadActivityHeatmap";

function expectedHeatmapCells(weeks: number): number {
  const daysSinceMonday = (new Date().getDay() + 6) % 7;
  return (weeks - 1) * 7 + daysSinceMonday + 1;
}

const completedAt = new Date().toISOString();
const completed: AlbumTransfer = {
  id: "file", albumId: "album", userId: "viewer", name: "photo.jpg",
  createdAt: completedAt, completedAt, status: "success", loaded: 100, total: 100,
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
    useUploadProgress.setState({ transfers: { file: completed } });
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
      <MemoryRouter><LocaleProvider><UploadActivityHeatmap /></LocaleProvider></MemoryRouter>
    </QueryClientProvider>,
  ));

  it("shows the successful file count for the last 36 weeks", async () => {
    await render();

    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector(".upload-activity__total")?.textContent).toBe("1 file"));
    });
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label"))
      .toBe("Upload activity over the last 36 weeks: 1 successful file");
    expect(container.querySelectorAll(".upload-activity__grid .upload-activity__day")).toHaveLength(expectedHeatmapCells(36));
    expect(container.querySelectorAll(".upload-activity__legend .upload-activity__day")).toHaveLength(6);
  });

  it("shows 12 weeks on mobile", async () => {
    isMobile = true;
    await render();

    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector(".upload-activity__total")?.textContent).toBe("1 file"));
    });
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-label"))
      .toBe("Upload activity over the last 12 weeks: 1 successful file");
    expect(container.querySelectorAll(".upload-activity__grid .upload-activity__day")).toHaveLength(expectedHeatmapCells(12));
  });

  it("scales the week range when the viewport crosses the mobile breakpoint", async () => {
    await render();

    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector(".upload-activity__total")?.textContent).toBe("1 file"));
    });
    expect(container.querySelectorAll(".upload-activity__grid .upload-activity__day")).toHaveLength(expectedHeatmapCells(36));

    await act(async () => {
      isMobile = true;
      mediaListeners.forEach((listener) => listener());
    });

    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[role="group"]')?.getAttribute("aria-label"))
          .toBe("Upload activity over the last 12 weeks: 1 successful file");
      });
    });
    expect(container.querySelectorAll(".upload-activity__grid .upload-activity__day")).toHaveLength(expectedHeatmapCells(12));
  });
});
