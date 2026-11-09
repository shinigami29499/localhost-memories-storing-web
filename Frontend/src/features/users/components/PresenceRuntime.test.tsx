// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../../store/authStore";
import type { AuthUser } from "../../auth/types";
import { PresenceRuntime } from "./PresenceRuntime";

const hub = vi.hoisted(() => {
  const handlers: Record<string, (...args: never[]) => void> = {};
  const connection = {
    state: "Connected", on: vi.fn((name: string, handler: (...args: never[]) => void) => { handlers[name] = handler; }),
    onreconnected: vi.fn(), onclose: vi.fn(), start: vi.fn(async () => {}),
    invoke: vi.fn(async () => {}), stop: vi.fn(async () => {}),
  };
  return { handlers, connection, build: vi.fn(() => connection) };
});
vi.mock("@microsoft/signalr", () => ({
  LogLevel: { Error: 0 },
  HubConnectionBuilder: class {
    withUrl() { return this; }
    withAutomaticReconnect() { return this; }
    configureLogging() { return this; }
    build() { return hub.build(); }
  },
}));
vi.mock("../../../components/ui/CustomDialog", () => ({
  CustomDialog: {}, useCustomDialog: () => ({ dialogProps: {}, close: vi.fn(), openDialog: vi.fn() }),
}));
vi.mock("../../../components/ui/Toast", () => ({ showToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../services/userService", () => ({ userService: { heartbeat: vi.fn(async () => ({})) } }));

describe("shared presence runtime", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); sessionStorage.clear(); });

  it("keeps one connection across token refresh and updates paged user presence", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const me: AuthUser = { id: "me", username: "Me", role: "user", status: "active", createdAt: "2026-01-01T00:00:00Z" };
    const other = { ...me, id: "other", username: "Other", lastSeenAt: null };
    useAuthStore.setState({ accessToken: "first", user: me });
    const client = new QueryClient();
    const key = ["users", "page", "all", 1, 10];
    client.setQueryData(key, { items: [other], page: 1, limit: 10, total: 1 });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<QueryClientProvider client={client}><PresenceRuntime /></QueryClientProvider>));
      await act(async () => useAuthStore.setState({ accessToken: "refreshed" }));
      expect(hub.build).toHaveBeenCalledTimes(1);
      await act(async () => hub.handlers.UserPresenceChanged({ userId: "other", username: "Other",
        online: true, lastSeenAt: "2026-11-01T00:00:00Z" } as never));
      expect(client.getQueryData<{ items: { lastSeenAt: string }[] }>(key)?.items[0].lastSeenAt)
        .toBe("2026-11-01T00:00:00Z");
    } finally {
      await act(async () => root.unmount());
      client.clear();
      container.remove();
      useAuthStore.getState().clear();
    }
    expect(hub.connection.stop).toHaveBeenCalledOnce();
  });
});
