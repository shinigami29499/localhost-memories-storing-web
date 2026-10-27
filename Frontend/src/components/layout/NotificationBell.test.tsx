// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
import { ThemeProvider } from "../../context/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { NotificationBell } from "./NotificationBell";
import { useUploadNotificationStore } from "../../features/notifications/uploadNotificationStore";

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
    vi.clearAllMocks();
    useUploadNotificationStore.setState({ items: [] });
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
    useAuthStore.getState().clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function renderBell() {
    await act(async () => {
      root.render(
        <ThemeProvider>
          <LocaleProvider>
            <QueryClientProvider client={new QueryClient()}>
              <AnimateUIProvider reducedMotion="always">
                <MemoryRouter>
                  <NotificationBell />
                </MemoryRouter>
              </AnimateUIProvider>
            </QueryClientProvider>
          </LocaleProvider>
        </ThemeProvider>,
      );
    });
  }

  it("marks all notifications as read when the panel opens", async () => {
    await renderBell();

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".notification-bar__trigger")!.click();
    });

    expect(markAllRead).toHaveBeenCalledOnce();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("shows only the current user's upload notifications and marks them read locally", async () => {
    useUploadNotificationStore.setState({
      items: ["viewer", "another-user"].map((userId) => ({
        id: `upload:${userId}:batch`,
        userId,
        notificationType: "UploadCompleted",
        postId: "finished-post",
        postCaption: `${userId}'s post`,
        createdAt: "2026-10-28T00:00:00Z",
        readAt: null,
      })),
    });
    await renderBell();
    expect(container.querySelector(".notification-bar__badge")?.textContent).toBe("1");
    await act(async () => container.querySelector<HTMLButtonElement>(".notification-bar__trigger")!.click());

    expect(container.textContent).toContain("Upload batch completed");
    expect(container.textContent).toContain("viewer's post");
    expect(container.textContent).not.toContain("another-user's post");
    expect(container.querySelector(".notification-bar__item")?.getAttribute("href")).toBe("/posts/finished-post");
    expect(container.querySelector(".notification-bar__badge")).toBeNull();
    expect(useUploadNotificationStore.getState().items.find((item) => item.userId === "viewer")?.readAt).toBeTruthy();
    expect(useUploadNotificationStore.getState().items.find((item) => item.userId === "another-user")?.readAt).toBeNull();
    expect(markAllRead).toHaveBeenCalledOnce();
  });
});
