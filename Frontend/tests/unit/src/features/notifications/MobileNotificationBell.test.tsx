// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../../../src/context/LocaleContext";
import { useAuthStore } from "../../../../../src/store/authStore";
import { useUploadNotificationStore } from "../../../../../src/features/notifications/uploadNotificationStore";
import { MobileNotificationBell } from "../../../../../apps/mobile/src/MobileNotificationBell";

const { markAllBatchesViewed } = vi.hoisted(() => ({ markAllBatchesViewed: vi.fn(async () => undefined) }));
vi.mock("../../../../../src/features/uploads/services/uploadService", () => ({ uploadService: { markAllBatchesViewed } }));
vi.mock("../../../../../src/components/animate-ui/icons/icon", () => ({ AnimateIcon: ({ children }: { children: ReactNode }) => children }));
vi.mock("../../../../../src/components/animate-ui/icons/bell", () => ({ Bell: () => null }));
vi.mock("../../../../../src/components/animate-ui/icons/check-check", () => ({ CheckCheckIcon: () => null }));
vi.mock("../../../../../src/components/ui/LanguageToggleButton", () => ({ LanguageToggleButton: () => null }));

it("shows only current-user notifications, marks them read and returns focus on Escape", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  useAuthStore.setState({ user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "" } });
  useUploadNotificationStore.setState({ items: ["viewer", "other"].map((userId) => ({ id: `upload:${userId}:batch`, userId, notificationType: "UploadCompleted" as const, createdAt: "2026-10-28T00:00:00Z", readAt: null })) });
  const client = new QueryClient();
  const element = document.createElement("div"); document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<LocaleProvider><QueryClientProvider client={client}><MemoryRouter><MobileNotificationBell /></MemoryRouter></QueryClientProvider></LocaleProvider>));
    const trigger = element.querySelector<HTMLButtonElement>('button[aria-expanded]')!;
    expect(trigger.getAttribute("aria-label")).toContain("1 unread");
    await act(async () => trigger.click());
    expect(element.querySelectorAll(".mobile-notification__list li")).toHaveLength(1);
    await act(async () => element.querySelector<HTMLButtonElement>('button[aria-label="Mark all as read"]')!.click());
    expect(markAllBatchesViewed).toHaveBeenCalledOnce();
    expect(trigger.getAttribute("aria-label")).toBe("Notifications");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  } finally {
    await act(async () => root.unmount()); client.clear(); element.remove();
    useAuthStore.getState().clear(); useUploadNotificationStore.setState({ items: [] }); vi.unstubAllGlobals();
  }
});
