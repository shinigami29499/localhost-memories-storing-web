// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocationSearch } from "./LocationSearch";
import { searchLocations, type LocationSearchResult } from "../services/locationSearchService";

vi.mock("../services/locationSearchService", () => ({ searchLocations: vi.fn() }));
vi.mock("../../../components/ui", async () => ({
  Input: (await import("../../../components/ui/Input")).Input,
}));
vi.mock("../../../components/animate-ui/icons/icon", () => ({
  AnimateIcon: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../../../components/animate-ui/icons/search", () => ({ Search: () => <svg /> }));
vi.mock("../../../context/LocaleContext", () => ({
  useLocale: () => ({ t: (message: string) => message }),
}));

const place: LocationSearchResult = {
  id: "photon:0:105.854041,21.0283334",
  latitude: 21.0283334, longitude: 105.854041, placeName: "Hanoi, Vietnam",
};

describe("LocationSearch", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  const onSelect = vi.fn();
  const onFocus = vi.fn();
  const search = vi.mocked(searchLocations);

  const render = async (disabled = false) => {
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <LocationSearch disabled={disabled} onSelect={onSelect} onFocus={onFocus} />
      </QueryClientProvider>,
    ));
  };
  const input = () => {
    const element = container.querySelector<HTMLInputElement>('input[name="query"]');
    if (!element) throw new Error("Search input is missing.");
    return element;
  };
  const change = async (value: string) => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setValue) throw new Error("Input value setter is unavailable.");
    await act(async () => {
      input().focus();
      setValue.call(input(), value);
      input().dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const advance = async (milliseconds = 500) => {
    await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    search.mockResolvedValue([place]);
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await render();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("searches typed text in the background after a 500 ms pause without opening another tab", async () => {
    await change("Hanoi");
    await advance(498);
    expect(search).not.toHaveBeenCalled();
    await advance(1);
    expect(search).toHaveBeenCalledExactlyOnceWith("Hanoi", expect.any(AbortSignal));
    expect(container.querySelector('[aria-label="Search results"]')?.textContent).toContain(place.placeName);
    expect(container.querySelector("form")?.getAttribute("action")).toBeNull();
    expect(container.querySelectorAll("input")).toHaveLength(1);
  });

  it("selects the returned name and coordinates through the existing map callback", async () => {
    await change("Hanoi");
    await advance();
    const button = container.querySelector<HTMLButtonElement>(".food__location-search-results button");
    expect(button).not.toBeNull();
    await act(async () => button?.click());
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(place);
    expect(container.querySelector(".food__location-search-results")).toBeNull();
    await advance();
    expect(search).toHaveBeenCalledOnce();
  });

  it("does not search short text and resets the debounce when typing continues", async () => {
    await change("Ha");
    await advance();
    expect(search).not.toHaveBeenCalled();
    expect(container.querySelector('[role="status"]')?.textContent).toContain("at least 3");
    await change("Han");
    await advance(200);
    await change("Hanoi");
    await advance();
    expect(search).toHaveBeenCalledExactlyOnceWith("Hanoi", expect.any(AbortSignal));
  });

  it("cancels stale searches and never displays their late results", async () => {
    let resolveOld!: (results: LocationSearchResult[]) => void;
    search.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    await change("Hanoi");
    await advance();
    const signal = search.mock.calls[0][1];
    await change("Paris");
    expect(signal?.aborted).toBe(true);
    search.mockResolvedValue([{ ...place, id: "paris", placeName: "Paris" }]);
    await advance();
    await act(async () => resolveOld([place]));
    await advance(1);
    expect(container.querySelector(".food__location-search-results")?.textContent).toBe("Paris");
  });

  it("shows errors with manual retry and an explicit empty state", async () => {
    search.mockRejectedValueOnce(new Error("Network failed"));
    await change("Hanoi");
    await advance();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not search locations");
    expect(search).toHaveBeenCalledOnce();
    search.mockResolvedValue([]);
    const retry = container.querySelector<HTMLButtonElement>(".food__location-search-message button");
    await act(async () => retry?.click());
    await advance(1);
    expect(search).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="status"]')?.textContent).toBe("No matching locations found.");
  });

  it("blocks searches while disabled and cancels an in-flight request", async () => {
    search.mockImplementation(() => new Promise(() => {}));
    await change("Hanoi");
    await advance();
    const signal = search.mock.calls[0][1];
    await render(true);
    expect(input().disabled).toBe(true);
    expect(signal?.aborted).toBe(true);
    expect(container.querySelector(".food__location-search-results")).toBeNull();
    await advance();
    expect(search).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keeps the icon decorative and closes results on Escape", async () => {
    await change("Hanoi");
    await advance();
    expect(container.querySelector(".food__location-search-icon")?.tagName).toBe("SPAN");
    expect(onFocus).toHaveBeenCalledOnce();
    await act(async () => input().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(container.querySelector(".food__location-search-results")).toBeNull();
  });
});
