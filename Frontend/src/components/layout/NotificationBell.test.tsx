// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
import { ThemeProvider } from "../../context/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useUploadNotificationStore } from "../../features/notifications/uploadNotificationStore";
import { NotificationBell } from "./NotificationBell";

describe("NotificationBell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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
            <AnimateUIProvider reducedMotion="always">
              <MemoryRouter><NotificationBell /></MemoryRouter>
            </AnimateUIProvider>
          </LocaleProvider>
        </ThemeProvider>,
      );
    });
  }

  it("shows only the current user's upload notifications and marks them read when opened", async () => {
    useUploadNotificationStore.setState({
      items: ["viewer", "another-user"].map((userId) => ({
        id: `upload:${userId}:batch`,
        userId,
        notificationType: "UploadCompleted" as const,
        createdAt: "2026-10-28T00:00:00Z",
        readAt: null,
      })),
    });
    await renderBell();
    expect(container.querySelector(".notification-bar__badge")?.textContent).toBe("1");

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".notification-bar__trigger")!.click();
    });

    expect(container.textContent).toContain("Upload batch completed");
    expect(container.querySelector(".notification-bar__item")?.getAttribute("href")).toBe("/sync/upload");
    expect(container.querySelector(".notification-bar__badge")).toBeNull();
    expect(useUploadNotificationStore.getState().items.find((item) => item.userId === "viewer")?.readAt).toBeTruthy();
    expect(useUploadNotificationStore.getState().items.find((item) => item.userId === "another-user")?.readAt).toBeNull();
  });
});
