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
  UploadBatchCard: ({ batch }: { batch: UploadBatch }) => <div data-batch-id={batch.id} />,
}));
vi.mock("../../features/uploads/components/UploadActivityDialog", () => ({
  UploadActivityDialog: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Upload activity">
      <button type="button" onClick={onClose}>Close activity</button>
    </div>
  ),
}));
vi.mock("../../components/ui", () => ({
  Button: ({ busy, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) => (
    <button {...props} aria-busy={busy || undefined} disabled={props.disabled || busy} />
  ),
  showToast: { success: vi.fn(), error: vi.fn() },
  DatePicker: ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <input
      data-date-picker
      type="date"
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  ),
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
    const upload = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Upload media")!;
    const attach = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Select files")!;
    const openPicker = vi.spyOn(input, "click").mockImplementation(() => {});
    expect(upload.disabled).toBe(true);
    expect(attach.querySelector("svg")).not.toBeNull();
    await act(async () => attach.click());
    expect(openPicker).toHaveBeenCalledOnce();
    expect(input.hidden).toBe(true);
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(upload.disabled).toBe(false);
    expect(container.textContent).toContain("1 files selected");
    await act(async () => upload.click());

    await vi.waitFor(() => expect(uploadService.submit).toHaveBeenCalledWith([file]));
    expect(upload.disabled).toBe(true);
    expect(container.textContent).toContain("Upload images and videos");
  });

  it("opens and closes the upload activity heatmap from the toolbar", async () => {
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <LocaleProvider>
          <AnimateUIProvider reducedMotion="always">
            <UploadManagementPage />
          </AnimateUIProvider>
        </LocaleProvider>
      </QueryClientProvider>,
    ));

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    const activity = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Activity")!;
    await act(async () => activity.click());

    const dialog = container.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-label")).toBe("Upload activity");

    await act(async () => dialog.querySelector("button")!.click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
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

  it.each(["user", "admin"])("filters and clears history for a %s", async (role) => {
    useAuthStore.setState({
      user: { id: "viewer", username: "viewer", role, status: "active", createdAt: "" },
    });
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <LocaleProvider><UploadManagementPage /></LocaleProvider>
      </QueryClientProvider>,
    ));
    const list = role === "admin" ? uploadService.listAll : uploadService.list;
    const dateInput = container.querySelector<HTMLInputElement>("[data-date-picker]")!;
    expect(dateInput.closest(".upload-page__toolbar")).not.toBeNull();
    expect(container.querySelector('[aria-label="Remove filter"]')).toBeNull();

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(dateInput, "2026-10-30");
      dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await vi.waitFor(() => expect(container.textContent).toContain("No uploads on this date"));
    });
    expect(list).toHaveBeenLastCalledWith(0, 10, "2026-10-30");
    expect(container.querySelectorAll('input[type="date"]')).toHaveLength(1);
    const removeFilter = container.querySelector<HTMLButtonElement>('[aria-label="Remove filter"]')!;

    await act(async () => removeFilter.click());
    await act(async () => {
      await vi.waitFor(() => expect(container.textContent).toContain("No upload batches"));
    });
    expect(dateInput.value).toBe("");
    expect(list).toHaveBeenLastCalledWith(0, 10, undefined);
    expect(container.querySelector('[aria-label="Remove filter"]')).toBeNull();
  });

  it("resets pagination when the date changes and when the filter is removed", async () => {
    vi.mocked(uploadService.list).mockImplementation(async (offset = 0, limit = 10) => ({
      offset, limit, totalItems: 25, items: [emptyBatch],
    }));
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <LocaleProvider>
          <AnimateUIProvider reducedMotion="always">
            <UploadManagementPage />
          </AnimateUIProvider>
        </LocaleProvider>
      </QueryClientProvider>,
    ));
    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(false));
    });
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click());
    await act(async () => {
      await vi.waitFor(() => expect(uploadService.list).toHaveBeenLastCalledWith(10, 10, undefined));
    });

    const dateInput = container.querySelector<HTMLInputElement>("[data-date-picker]")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(dateInput, "2026-10-30");
      dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(false));
    });
    expect(uploadService.list).toHaveBeenLastCalledWith(0, 10, "2026-10-30");

    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click());
    await act(async () => {
      await vi.waitFor(() => expect(uploadService.list).toHaveBeenLastCalledWith(10, 10, "2026-10-30"));
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Remove filter"]')!.click();
    });
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
    expect(dateInput.value).toBe("");
  });

  it("does not show unfiltered rows while a new date is loading", async () => {
    vi.mocked(uploadService.list).mockImplementation((_offset, _limit, date) => date
      ? new Promise(() => {})
      : Promise.resolve({ offset: 0, limit: 10, totalItems: 1, items: [emptyBatch] }));
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <LocaleProvider>
          <AnimateUIProvider reducedMotion="always">
            <UploadManagementPage />
          </AnimateUIProvider>
        </LocaleProvider>
      </QueryClientProvider>,
    ));
    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector('[data-batch-id="batch"]')).not.toBeNull());
    });
    const dateInput = container.querySelector<HTMLInputElement>("[data-date-picker]")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(dateInput, "2026-10-30");
      dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.querySelector('[data-batch-id="batch"]')).toBeNull();
    expect(container.textContent).toContain("Loading");
    expect(container.querySelector(".upload-page__footer")).toBeNull();
  });
});
