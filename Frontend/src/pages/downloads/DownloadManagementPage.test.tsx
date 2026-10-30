// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../store/authStore";
import { DownloadRuntime } from "../../features/downloads/components/DownloadRuntime";
import { cancelDownload, retryDownload, useDownloadStore, type DownloadBatch } from "../../features/downloads/services/downloadQueue";
import { DownloadManagementPage } from "./DownloadManagementPage";

vi.mock("../../features/downloads/services/downloadQueue", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../features/downloads/services/downloadQueue")>(),
  cancelDownload: vi.fn(),
  retryDownload: vi.fn(),
}));

const batch: DownloadBatch = {
  id: "batch", createdAt: "2026-10-30T00:00:00Z",
  items: [{
    id: "first", mediaId: "image", originalFilename: "photo.png", fileSizeBytes: 100,
    loaded: 0, includeDeleted: false, status: "Failed", error: "Original file is missing.",
  }, {
    id: "second", mediaId: "video", originalFilename: "movie.mp4", fileSizeBytes: 100,
    loaded: 50, includeDeleted: false, status: "Downloading",
  }],
};

describe("download management", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("SVGGeometryElement", class extends SVGElement {});
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })));
    vi.mocked(retryDownload).mockClear();
    vi.mocked(cancelDownload).mockClear();
    useDownloadStore.setState({ batches: [] });
    useAuthStore.setState({
      accessToken: "test-token",
      user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "" },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useDownloadStore.setState({ batches: [] });
    useAuthStore.getState().clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function render() {
    await act(async () => root.render(
      <MemoryRouter><DownloadRuntime /><DownloadManagementPage /></MemoryRouter>,
    ));
  }

  it("explains how to start downloads and discloses browser and session limits", async () => {
    await render();
    expect(container.querySelector("h1")?.textContent).toBe("Download management");
    expect(container.textContent).toContain("No downloads yet");
    expect(container.textContent).toContain("not automatically to Photos");
    expect(container.textContent).toContain("saving cannot be confirmed here");
    expect(container.querySelector('a[href="/library/gallery"]')).not.toBeNull();
  });

  it("shows per-file errors, progress, retry and cancellation controls", async () => {
    useDownloadStore.setState({ batches: [batch] });
    await render();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Original file is missing.");
    expect(container.textContent).toContain("50%");
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Retry download: photo.png"]')!.click());
    expect(retryDownload).toHaveBeenCalledWith("first");
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Cancel download: movie.mp4"]')!.click());
    expect(cancelDownload).toHaveBeenCalledWith("second");
  });

  it.each(["sign-out", "account-switch"])("clears download history on %s", async (change) => {
    useDownloadStore.setState({ batches: [batch] });
    await render();
    await act(async () => {
      if (change === "sign-out") useAuthStore.getState().clear();
      else useAuthStore.setState({ user: { ...useAuthStore.getState().user!, id: "other-viewer" } });
    });
    expect(useDownloadStore.getState().batches).toEqual([]);
    expect(container.textContent).toContain("No downloads yet");
  });

  it("offers download again after browser handoff without claiming a disk save", async () => {
    useDownloadStore.setState({ batches: [{
      ...batch, items: [{ ...batch.items[0], status: "Sent to browser", error: undefined, loaded: 100 }],
    }] });
    await render();
    expect(container.textContent).toContain("Sent to browser");
    expect(container.textContent).toContain("100%");
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Download again: photo.png"]')!.click());
    expect(retryDownload).toHaveBeenCalledWith("first");
  });
});
