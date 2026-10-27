// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../store/authStore";
import { useNotifications } from "../../features/notifications/hooks/useNotifications";
import { UploadManagementPage } from "./UploadManagementPage";
import type { UploadBatch } from "../../features/uploads/types";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  listAll: vi.fn(),
  listNotifications: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  wakeUploadRuntime: vi.fn(),
  handlers: new Map<string, () => void>(),
  reconnected: undefined as (() => void) | undefined,
}));

vi.mock("../../features/uploads/services/uploadRuntime", () => ({
  wakeUploadRuntime: mocks.wakeUploadRuntime,
  requestUploadRetry: vi.fn(),
  cancelRunningUpload: vi.fn(),
}));

vi.mock("@microsoft/signalr", () => ({
  LogLevel: { Error: 4 },
  HubConnectionBuilder: class {
    withUrl() { return this; }
    withAutomaticReconnect() { return this; }
    configureLogging() { return this; }
    build() {
      return {
        start: mocks.start,
        stop: mocks.stop,
        on: (name: string, handler: () => void) => mocks.handlers.set(name, handler),
        off: (name: string) => mocks.handlers.delete(name),
        onreconnecting: vi.fn(),
        onreconnected: (handler: () => void) => { mocks.reconnected = handler; },
        onclose: vi.fn(),
      };
    }
  },
}));

vi.mock("../../features/uploads/services/uploadService", () => ({
  uploadService: { list: mocks.list, listAll: mocks.listAll },
}));
vi.mock("../../features/notifications/services/notificationService", () => ({
  notificationService: { list: mocks.listNotifications },
}));
vi.mock("../../context/LocaleContext", () => ({
  useLocale: () => ({
    t: (key: string, values: Record<string, string | number> = {}) =>
      key.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match)),
  }),
}));
vi.mock("../../features/uploads/components/UploadBatchCard", () => ({
  UploadBatchCard: ({ batch }: { batch: UploadBatch }) => <div>{batch.caption}</div>,
}));
vi.mock("../../components/ui/Button", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));
vi.mock("../../components/ui/Status", () => ({
  Spinner: () => <div>Loading</div>,
  ErrorState: () => <div>Error</div>,
  EmptyState: () => <div>No upload batches</div>,
}));
vi.mock("../../components/ui", () => ({ showToast: { error: vi.fn() } }));

function Screen() {
  useNotifications();
  return <UploadManagementPage />;
}

describe("UploadManagementPage live updates", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;
  const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
  const originalGetAnimations = Object.getOwnPropertyDescriptor(Element.prototype, "getAnimations");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.handlers.clear();
    mocks.reconnected = undefined;
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
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
    vi.stubGlobal("matchMedia", vi.fn((media: string) => ({
      matches: false,
      media,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn(), finish: vi.fn() })),
    });
    Object.defineProperty(Element.prototype, "getAnimations", {
      configurable: true,
      value: vi.fn(() => []),
    });
    window.localStorage.removeItem("uploads.limit");
    mocks.start.mockResolvedValue(undefined);
    mocks.stop.mockResolvedValue(undefined);
    mocks.listNotifications.mockResolvedValue({ items: [], unreadCount: 0 });
    const page = { items: [], offset: 0, limit: 20, totalItems: 0 };
    mocks.list.mockResolvedValue(page);
    mocks.listAll.mockResolvedValue(page);
    useAuthStore.setState({
      accessToken: "test-token",
      user: { id: "viewer", username: "viewer", role: "User", status: "active", createdAt: "" },
    });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 15_000 } },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
    useAuthStore.getState().clear();
    window.localStorage.removeItem("uploads.limit");
    if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
    else Reflect.deleteProperty(Element.prototype, "animate");
    if (originalGetAnimations) Object.defineProperty(Element.prototype, "getAnimations", originalGetAnimations);
    else Reflect.deleteProperty(Element.prototype, "getAnimations");
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function flush() {
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
  }

  async function renderScreen() {
    await act(async () => root.render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><Screen /></MemoryRouter>
      </QueryClientProvider>,
    ));
    await flush();
  }

  it("uses a full-width scroll layout and shared pagination without a create-post button, even when empty", async () => {
    await renderScreen();

    expect(container.querySelector(".upload-page__content .upload-page__header")).not.toBeNull();
    expect(container.querySelector(".upload-page__footer .pagination")).not.toBeNull();
    expect(container.querySelector('[data-animate-ui-pagination]')).not.toBeNull();
    expect(container.textContent).not.toContain("Create a post");
    expect(container.textContent).toContain("No upload batches");
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(true);
    expect(mocks.list).toHaveBeenLastCalledWith(0, 10);
  });

  it.each(["20", "50", "invalid"])("restores supported saved page sizes: %s", async (stored) => {
    window.localStorage.setItem("uploads.limit", stored);
    await renderScreen();
    expect(mocks.list).toHaveBeenLastCalledWith(0, stored === "invalid" ? 10 : Number(stored));
  });

  it.each([false, true])("requests numbered pages and resets offset when page size changes (admin: %s)", async (admin) => {
    if (admin) {
      useAuthStore.setState({
        user: { id: "admin", username: "admin", role: "Admin", status: "active", createdAt: "" },
      });
    }
    const list = admin ? mocks.listAll : mocks.list;
    list.mockImplementation((offset: number, limit: number) =>
      Promise.resolve({ items: [], offset, limit, totalItems: 60 }));
    await renderScreen();
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Page 3"]')!.click());
    await flush();
    expect(list).toHaveBeenLastCalledWith(20, 10);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("3");

    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Items per page"]')!.click());
    await act(async () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
      .find((option) => option.textContent === "20")!.click());
    await flush();

    expect(list).toHaveBeenLastCalledWith(0, 20);
    expect(window.localStorage.getItem("uploads.limit")).toBe("20");
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
  });

  it("keeps pagination visible and disables it while the next page loads", async () => {
    mocks.list.mockResolvedValue({ items: [], offset: 0, limit: 10, totalItems: 30 });
    await renderScreen();
    const footer = container.querySelector(".upload-page__footer");
    let resolvePage!: (page: { items: []; offset: number; limit: number; totalItems: number }) => void;
    mocks.list.mockImplementationOnce(() => new Promise((resolve) => { resolvePage = resolve; }));
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click());
    await flush();

    expect(container.querySelector(".upload-page__footer")).toBe(footer);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Page 1"]')?.disabled).toBe(true);

    await act(async () => resolvePage({ items: [], offset: 10, limit: 10, totalItems: 30 }));
    await flush();
    expect(mocks.list).toHaveBeenLastCalledWith(10, 10);
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.disabled).toBe(false);
  });

  it.each([5, 0])("returns to the first page when a live update reduces the total to %s", async (totalItems) => {
    mocks.list.mockResolvedValue({ items: [], offset: 0, limit: 10, totalItems: 30 });
    await renderScreen();
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Page 3"]')!.click());
    await flush();
    mocks.list.mockImplementation((offset: number, limit: number) =>
      Promise.resolve({ items: [], offset, limit, totalItems }));

    await act(async () => mocks.handlers.get("UploadsChanged")!());
    await flush();
    await flush();

    expect(mocks.list).toHaveBeenLastCalledWith(0, 10);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("1");
  });

  it("does not poll, and refreshes rendered batches when an upload event arrives", async () => {
    await renderScreen();
    const initialCalls = mocks.list.mock.calls.length;
    expect(mocks.wakeUploadRuntime).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(mocks.list).toHaveBeenCalledTimes(initialCalls);
    expect(mocks.wakeUploadRuntime).toHaveBeenCalledOnce();

    mocks.list.mockResolvedValue({
      items: [{ id: "batch", caption: "Live upload" }],
      offset: 0, limit: 20, totalItems: 1,
    });
    await act(async () => mocks.handlers.get("UploadsChanged")!());
    await flush();

    expect(mocks.list).toHaveBeenCalledTimes(initialCalls + 1);
    expect(mocks.wakeUploadRuntime).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Live upload");
  });

  it("refreshes the admin list on events and reconnects", async () => {
    useAuthStore.setState({
      user: { id: "admin", username: "admin", role: "Admin", status: "active", createdAt: "" },
    });
    await renderScreen();
    const initialCalls = mocks.listAll.mock.calls.length;

    await act(async () => mocks.handlers.get("UploadsChanged")!());
    await flush();
    expect(mocks.listAll).toHaveBeenCalledTimes(initialCalls + 1);
    expect(mocks.list).not.toHaveBeenCalled();

    await act(async () => mocks.reconnected!());
    await flush();
    expect(mocks.listAll).toHaveBeenCalledTimes(initialCalls + 2);
    expect(mocks.listNotifications).toHaveBeenCalledTimes(2);
    expect(mocks.wakeUploadRuntime).toHaveBeenCalledTimes(3);
  });

  it("catches changes missed before connecting and removes handlers on unmount", async () => {
    let connect: () => void = () => { throw new Error("Connection has not started."); };
    mocks.start.mockImplementationOnce(() => new Promise<void>((resolve) => { connect = resolve; }));
    await renderScreen();
    expect(mocks.list).toHaveBeenCalledTimes(1);

    await act(async () => connect());
    await flush();
    expect(mocks.list).toHaveBeenCalledTimes(2);

    await act(async () => root.render(null));
    expect(mocks.handlers.has("UploadsChanged")).toBe(false);
    expect(mocks.stop).toHaveBeenCalledOnce();
  });
});
