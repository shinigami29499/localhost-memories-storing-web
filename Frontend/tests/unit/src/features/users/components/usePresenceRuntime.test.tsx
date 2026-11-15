// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../../../../src/context/LocaleContext";
import { useAuthStore } from "../../../../../../src/store/authStore";
import { usePresenceRuntime } from "../../../../../../src/features/users/components/usePresenceRuntime";

const { handlers, stop } = vi.hoisted(() => ({
  handlers: new Map<string, (reason: string) => void>(),
  stop: vi.fn(),
}));
vi.mock("../../../../../../packages/core/src/notificationTransport", () => ({
  createNotificationTransport: ({ configure }: { configure: (connection: unknown) => void }) => {
    configure({ on: (name: string, handler: (reason: string) => void) => handlers.set(name, handler), onreconnected: vi.fn() });
    return { start: vi.fn(), stop };
  },
}));
vi.mock("../../../../../../src/features/users/services/userService", () => ({ userService: { heartbeat: vi.fn().mockResolvedValue(undefined) } }));

function Harness() {
  const { accountChange, dialogProps } = usePresenceRuntime();
  return <output data-open={dialogProps.open}>{accountChange}</output>;
}

it("opens for account changes, ignores unknown events, and stops transport on unmount", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  useAuthStore.setState({ accessToken: "token", user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "" } });
  const client = new QueryClient();
  const element = document.createElement("div"); document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<LocaleProvider><QueryClientProvider client={client}><Harness /></QueryClientProvider></LocaleProvider>));
    await act(async () => handlers.get("AccountChanged")!("unknown"));
    expect(element.querySelector("output")?.dataset.open).toBe("false");
    await act(async () => handlers.get("AccountChanged")!("disabled"));
    expect(element.querySelector("output")?.textContent).toBe("disabled");
    expect(element.querySelector("output")?.dataset.open).toBe("true");
    await act(async () => handlers.get("AccountChanged")!("roleUpdated"));
    expect(element.querySelector("output")?.textContent).toBe("roleUpdated");
  } finally {
    await act(async () => root.unmount());
    expect(stop).toHaveBeenCalledOnce();
    client.clear(); element.remove(); handlers.clear(); useAuthStore.getState().clear(); vi.unstubAllGlobals();
  }
});
