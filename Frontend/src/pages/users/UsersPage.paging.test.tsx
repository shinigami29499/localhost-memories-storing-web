// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../store/authStore";
import { userService } from "../../features/users/services/userService";
import type { AuthUser } from "../../features/auth";
import { UsersPage } from "./UsersPage";

vi.mock("../../features/users/services/userService", () => ({ userService: { page: vi.fn() } }));

const users: AuthUser[] = Array.from({ length: 25 }, (_, index) => ({
  id: `user-${index}`, username: `member-${index}`, role: "user",
  status: index < 3 ? "pending_approval" : "active", createdAt: "2026-01-01T00:00:00Z",
}));

describe("user directory paging", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); window.localStorage.clear(); });

  it("keeps the requested page and filters the full directory on the server", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("matchMedia", vi.fn((media: string) => ({ matches: false, media,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })));
    useAuthStore.setState({ user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "2026-01-01T00:00:00Z" } });
    vi.mocked(userService.page).mockImplementation(async (page, limit, pendingOnly) => {
      const filtered = users.filter((user) => !pendingOnly || user.status === "pending_approval");
      return { items: filtered.slice((page - 1) * limit, page * limit), page, limit,
        total: filtered.length, allCount: users.length, pendingCount: 3 };
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const settle = () => new Promise((resolve) => setTimeout(resolve, 30));
    try {
      await act(async () => {
        root.render(<MemoryRouter><QueryClientProvider client={client}><UsersPage /></QueryClientProvider></MemoryRouter>);
        await settle();
      });
      await act(async () => { await settle(); });
      expect(container.textContent).toContain("member-0");
      await act(async () => {
        container.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click();
        await settle();
      });
      await act(async () => { await settle(); });
      expect(userService.page).toHaveBeenCalledWith(2, 10, false, expect.any(AbortSignal));
      expect(container.textContent).toContain("member-10");
      const pending = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
        .find((tab) => tab.textContent?.startsWith("Pending"))!;
      await act(async () => { pending.click(); await settle(); });
      await act(async () => { await settle(); });
      expect(userService.page).toHaveBeenCalledWith(1, 10, true, expect.any(AbortSignal));
      expect(container.textContent).toContain("member-2");
      expect(container.textContent).not.toContain("member-10");
    } finally {
      await act(async () => root.unmount());
      client.clear();
      container.remove();
      useAuthStore.getState().clear();
    }
  });
});
