// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocationSearch } from "../../../../../../src/features/locations/hooks/useLocationSearch";
import { searchLocations } from "../../../../../../src/features/locations/services/locationSearchService";

vi.mock("../../../../../../src/features/locations/services/locationSearchService", () => ({ searchLocations: vi.fn() }));

describe("location autocomplete timing", () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;
  let state: ReturnType<typeof useLocationSearch>;

  function Search({ query, enabled = true }: { query: string; enabled?: boolean }) {
    state = useLocationSearch(query, enabled);
    return null;
  }

  function render(query: string, enabled = true) {
    act(() => root.render(<QueryClientProvider client={client}><Search query={query} enabled={enabled} /></QueryClientProvider>));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(searchLocations).mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("waits for typing to settle and cancels on unmount", async () => {
    vi.mocked(searchLocations).mockResolvedValue([]);
    render("abc");
    await act(async () => { vi.advanceTimersByTime(250); });
    render("abcd");
    await act(async () => { vi.advanceTimersByTime(299); });
    expect(searchLocations).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(searchLocations).toHaveBeenCalledTimes(1);
    expect(vi.mocked(searchLocations).mock.calls[0][0]).toBe("abcd");
    render("abcde");
    act(() => root.unmount());
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(searchLocations).toHaveBeenCalledTimes(1);
    root = createRoot(container);
  });

  it("aborts obsolete requests and never displays their results", async () => {
    let resolveOld!: (value: Awaited<ReturnType<typeof searchLocations>>) => void;
    vi.mocked(searchLocations).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    vi.mocked(searchLocations).mockResolvedValueOnce([{ id: "new", placeName: "New", latitude: 1, longitude: 2 }]);
    render("old");
    await act(async () => { vi.advanceTimersByTime(300); });
    const oldSignal = vi.mocked(searchLocations).mock.calls[0][1];
    render("new");
    expect(oldSignal?.aborted).toBe(true);
    expect(state.results).toBeUndefined();
    await act(async () => { vi.advanceTimersByTime(300); });
    await act(async () => { resolveOld([{ id: "old", placeName: "Old", latitude: 1, longitude: 2 }]); });
    await act(async () => { vi.runOnlyPendingTimers(); });
    expect(state.results?.[0].id).toBe("new");
  });
});
