// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
import { uploadService } from "../../features/uploads/services/uploadService";
import type { UploadBatch } from "../../features/uploads/types";
import { useAuthStore } from "../../store/authStore";
import { UploadManagementPage } from "./UploadManagementPage";

vi.mock("../../features/uploads/services/uploadRuntime", () => ({
  cancelRunningUpload: vi.fn(),
  requestUploadRetry: vi.fn(),
}));
vi.mock("../../features/uploads/services/uploadService", () => ({
  uploadService: { list: vi.fn(), listAll: vi.fn(), submit: vi.fn() },
}));
vi.mock("../../features/uploads/services/uploadFileStore", () => ({
  saveUploadFile: vi.fn(),
}));
vi.mock("../../features/uploads/components/UploadBatchCard", () => ({
  UploadBatchCard: () => null,
}));
vi.mock("../../components/ui", () => ({
  Button: ({ busy, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) => (
    <button {...props} aria-busy={busy || undefined} disabled={props.disabled || busy} />
  ),
  showToast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("../../components/ui/Status", () => ({
  Spinner: () => <div>Loading</div>,
  ErrorState: () => <div>Error</div>,
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

const emptyBatch: UploadBatch = {
  id: "batch",
  status: "Pending",
  username: null,
  canManage: true,
  createdAt: "2026-10-28T00:00:00Z",
  startedAt: null,
  completedAt: null,
  totalFiles: 0,
  successfulFiles: 0,
  failedFiles: 0,
  pendingFiles: 0,
  uploadingFiles: 0,
  cancelledFiles: 0,
  progressPercent: 0,
  items: [],
};

describe("UploadManagementPage", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    window.localStorage.clear();
    vi.mocked(uploadService.list).mockResolvedValue({ offset: 0, limit: 10, totalItems: 0, items: [] });
    vi.mocked(uploadService.listAll).mockResolvedValue({ offset: 0, limit: 10, totalItems: 0, items: [] });
    vi.mocked(uploadService.submit).mockResolvedValue(emptyBatch);
    useAuthStore.setState({
      accessToken: "test-token",
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
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("submits selected files as a media upload batch", async () => {
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <LocaleProvider>
          <AnimateUIProvider reducedMotion="always">
            <MemoryRouter><UploadManagementPage /></MemoryRouter>
          </AnimateUIProvider>
        </LocaleProvider>
      </QueryClientProvider>,
    ));

    await vi.waitFor(() => expect(container.textContent).toContain("No upload batches"));
    const file = new File(["image bytes"], "photo.png", { type: "image/png" });
    const input = container.querySelector<HTMLInputElement>("#upload-media-files")!;
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    const submit = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Upload media")!;
    await act(async () => submit.click());

    await vi.waitFor(() => expect(uploadService.submit).toHaveBeenCalledWith([file]));
    expect(container.textContent).toContain("Upload images and videos");
  });

  it("keeps the page title and upload form visible while history loads", async () => {
    vi.mocked(uploadService.list).mockReturnValue(new Promise(() => {}));
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <LocaleProvider><UploadManagementPage /></LocaleProvider>
      </QueryClientProvider>,
    ));

    expect(container.querySelector("h1")?.textContent).toBe("Upload management");
    expect(container.querySelector("#upload-media-files")).not.toBeNull();
    expect(container.textContent).toContain("Loading");
    expect(container.querySelector('[aria-label="Select replacement file"]')?.hasAttribute("hidden")).toBe(true);
  });

  it("keeps the upload form available when history fails", async () => {
    vi.mocked(uploadService.list).mockRejectedValue(new Error("History unavailable"));
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <LocaleProvider><UploadManagementPage /></LocaleProvider>
      </QueryClientProvider>,
    ));

    await act(async () => {
      await vi.waitFor(() => expect(container.textContent).toContain("Error"));
    });
    expect(container.querySelector("h1")?.textContent).toBe("Upload management");
    expect(container.querySelector("#upload-media-files")).not.toBeNull();
  });
});
