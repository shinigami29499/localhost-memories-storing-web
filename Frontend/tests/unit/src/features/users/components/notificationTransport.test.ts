// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNotificationTransport } from "../../../../../../packages/core/src/notificationTransport";

const hub = vi.hoisted(() => {
  const connection = {
    state: "Disconnected", start: vi.fn(async () => {}), stop: vi.fn(async () => {}),
    invoke: vi.fn(async () => {}), onclose: vi.fn(),
  };
  return { connection, options: { current: undefined as { accessTokenFactory: () => string } | undefined } };
});
vi.mock("@microsoft/signalr", () => ({
  LogLevel: { Error: 0 },
  HubConnectionBuilder: class {
    withUrl(_url: string, options: { accessTokenFactory: () => string }) { hub.options.current = options; return this; }
    withAutomaticReconnect() { return this; }
    configureLogging() { return this; }
    build() { return hub.connection; }
  },
}));

describe("notification transport", () => {
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it("uses the current token and retries a closed connection", async () => {
    vi.useFakeTimers();
    let token = "first";
    const configure = vi.fn();
    const transport = createNotificationTransport({ apiBase: "", getAccessToken: () => token, configure, onFailure: vi.fn() });
    expect(configure).toHaveBeenCalledWith(hub.connection);
    transport.start();
    await vi.waitFor(() => expect(hub.connection.invoke).toHaveBeenCalledWith("TrackActivity"));
    token = "refreshed";
    expect(hub.options.current?.accessTokenFactory()).toBe("refreshed");
    hub.connection.onclose.mock.calls[0][0]();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(hub.connection.start).toHaveBeenCalledTimes(2);
    transport.stop();
    expect(hub.connection.stop).toHaveBeenCalledOnce();
  });

  it("retries a failed initial connection and reports failure", async () => {
    vi.useFakeTimers();
    hub.connection.start.mockRejectedValueOnce(new Error("offline"));
    const onFailure = vi.fn();
    const transport = createNotificationTransport({ apiBase: "", getAccessToken: () => "token", configure: vi.fn(), onFailure });
    transport.start();
    await Promise.resolve();
    expect(onFailure).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(hub.connection.start).toHaveBeenCalledTimes(2);
    transport.stop();
  });

  it("does not reconnect after cleanup", async () => {
    vi.useFakeTimers();
    const transport = createNotificationTransport({ apiBase: "", getAccessToken: () => "token", configure: vi.fn(), onFailure: vi.fn() });
    transport.start();
    await Promise.resolve();
    hub.connection.onclose.mock.calls[0][0]();
    transport.stop();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(hub.connection.start).toHaveBeenCalledOnce();
  });
});
