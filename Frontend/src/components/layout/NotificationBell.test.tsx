// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
import { useAuthStore } from "../../store/authStore";
import { NotificationBell } from "./NotificationBell";

const { markAllRead, refetch } = vi.hoisted(() => ({
  markAllRead: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("../../features/notifications/services/notificationService", () => ({
  notificationService: { markAllRead },
}));

vi.mock("../../features/notifications/hooks/useNotifications", () => ({
  notificationQueryKey: (userId: string | undefined) => ["notifications", userId],
  useNotifications: () => ({
    data: { items: [], unreadCount: 0 },
    isLoading: false,
    isError: false,
    refetch,
    liveStatus: "connected",
  }),
}));

describe("NotificationBell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })));
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() })),
    });
    markAllRead.mockResolvedValue(undefined);
    refetch.mockResolvedValue(undefined);
    useAuthStore.setState({ accessToken: "test-token" });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useAuthStore.getState().clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("marks all notifications as read when the panel opens", async () => {
    await act(async () => {
      root.render(
        <LocaleProvider>
          <QueryClientProvider client={new QueryClient()}>
            <AnimateUIProvider reducedMotion="always">
              <MemoryRouter>
                <NotificationBell />
              </MemoryRouter>
            </AnimateUIProvider>
          </QueryClientProvider>
        </LocaleProvider>,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".notification-bar__trigger")!.click();
    });

    expect(markAllRead).toHaveBeenCalledOnce();
    expect(refetch).toHaveBeenCalledOnce();
  });
});
