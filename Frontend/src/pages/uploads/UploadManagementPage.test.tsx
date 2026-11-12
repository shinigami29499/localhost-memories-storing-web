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
  stopUploadLocally: vi.fn(),
  setUploadPaused: vi.fn(),
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
  completedAt: null,
  totalFiles: 0,
  successfulFiles: 0,
  failedFiles: 0,
  cancelledFiles: 0,
  items: [],
};

describe("UploadManagementPage", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let triggerIntersection: (() => void) | undefined;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) {
        triggerIntersection = () => callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    window.localStorage.clear();
    vi.mocked(uploadService.list).mockResolvedValue({ totalItems: 0, items: [] });
    vi.mocked(uploadService.listAll).mockResolvedValue({ totalItems: 0, items: [] });
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

  const renderPage = (initialEntries = ["/uploads"]) => root.render(
    <QueryClientProvider client={client}>
      <LocaleProvider>
        <AnimateUIProvider reducedMotion="always">
          <MemoryRouter initialEntries={initialEntries}>
            <UploadManagementPage />
          </MemoryRouter>
        </AnimateUIProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );

  it("submits selected files as a media upload batch", async () => {
    await act(async () => renderPage());

    await vi.waitFor(() => expect(container.textContent).toContain("No uploads yet"));
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
    expect(container.querySelector<HTMLInputElement>("#upload-media-files")?.value).toBe("");
  });

  it("keeps the page title and upload form visible while history loads", async () => {
    vi.mocked(uploadService.list).mockReturnValue(new Promise(() => {}));
    await act(async () => renderPage());

    expect(container.querySelector("#upload-media-files")).not.toBeNull();
    expect(container.querySelector(".upload-page__toolbar")).not.toBeNull();
    expect(container.textContent).toContain("Loading");
    expect(container.querySelector('[aria-label="Select replacement file"]')).toBeNull();
  });

  it("keeps the upload form available when history fails", async () => {
    vi.mocked(uploadService.list).mockRejectedValue(new Error("History unavailable"));
    await act(async () => renderPage());

    await act(async () => {
      await vi.waitFor(() => expect(container.textContent).toContain("Error"));
    });
    expect(container.querySelector("#upload-media-files")).not.toBeNull();
  });

  it.each(["user", "admin"])("filters history and clears the date selection for a %s", async (role) => {
    useAuthStore.setState({
      user: { id: "viewer", username: "viewer", role, status: "active", createdAt: "" },
    });
    await act(async () => renderPage());
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

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(dateInput, "");
      dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await vi.waitFor(() => expect(container.textContent).toContain("No uploads yet"));
    });
    expect(dateInput.value).toBe("");
    expect(list).toHaveBeenLastCalledWith(0, 10, undefined);
    expect(container.querySelector('[aria-label="Remove filter"]')).toBeNull();
  });

  it("fetches more batches on scroll and resets to the first batch for each date", async () => {
    const firstPage = Array.from({ length: 10 }, (_, index) => ({ ...emptyBatch, id: `batch-${index}` }));
    vi.mocked(uploadService.list).mockImplementation(async (offset = 0, _limit = 10, date) => {
      if (date) return { totalItems: 1, items: [{ ...emptyBatch, id: "filtered-batch" }] };
      return offset === 0
        ? { totalItems: 11, items: firstPage }
        : { totalItems: 11, items: [{ ...emptyBatch, id: "batch-10" }] };
    });
    await act(async () => renderPage());
    await vi.waitFor(() => expect(container.querySelector('[data-batch-id="batch-9"]')).not.toBeNull());
    expect(container.querySelector(".pagination")).toBeNull();
    expect(container.querySelector('[data-batch-id="batch-10"]')).toBeNull();

    await act(async () => triggerIntersection?.());
    await vi.waitFor(() => expect(container.querySelector('[data-batch-id="batch-10"]')).not.toBeNull());
    expect(uploadService.list).toHaveBeenLastCalledWith(10, 10, undefined);

    const dateInput = container.querySelector<HTMLInputElement>("[data-date-picker]")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(dateInput, "2026-10-30");
      dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector('[data-batch-id="filtered-batch"]')).not.toBeNull());
    });
    expect(uploadService.list).toHaveBeenLastCalledWith(0, 10, "2026-10-30");
    expect(container.querySelector('[data-batch-id="batch-10"]')).toBeNull();

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(dateInput, "");
      dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await vi.waitFor(() => expect(container.querySelector('[data-batch-id="batch-0"]')).not.toBeNull());
    expect(dateInput.value).toBe("");
  });

  it("does not show unfiltered rows while a new date is loading", async () => {
    vi.mocked(uploadService.list).mockImplementation((_offset, _limit, date) => date
      ? new Promise(() => {})
      : Promise.resolve({ totalItems: 1, items: [emptyBatch] }));
    await act(async () => renderPage());
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
