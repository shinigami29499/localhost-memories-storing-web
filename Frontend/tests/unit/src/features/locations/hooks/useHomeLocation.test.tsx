// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { homeLocationService } from "../../../../../../src/features/locations/services/homeLocationService";
import { homeLocationKeys, useHomeLocation } from "../../../../../../src/features/locations/hooks/useHomeLocation";

vi.mock("../../../../../../src/features/locations/services/homeLocationService", () => ({
  homeLocationService: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
}));

let home: ReturnType<typeof useHomeLocation>;
const location = { latitude: 0, longitude: -120 };
function Harness() { home = useHomeLocation("owner"); return null; }

describe("useHomeLocation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.resetAllMocks();
    vi.mocked(homeLocationService.get).mockResolvedValue(null);
    vi.mocked(homeLocationService.set).mockImplementation(async (value) => value);
    vi.mocked(homeLocationService.clear).mockResolvedValue(undefined);
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it("saves home, applies it to photos and refreshes related data", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await act(async () => { await home.save.mutateAsync(location); });
    expect(homeLocationService.set).toHaveBeenNthCalledWith(1, location);
    expect(homeLocationService.set).toHaveBeenNthCalledWith(2, location, true);
    expect(client.getQueryData(homeLocationKeys.byUser("owner"))).toEqual(location);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["media"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["albums"] });
  });

  it("does not apply to photos when saving home fails", async () => {
    vi.mocked(homeLocationService.set).mockRejectedValueOnce(new Error("Home unavailable"));
    await act(async () => { await expect(home.save.mutateAsync(location)).rejects.toThrow("Home unavailable"); });
    expect(homeLocationService.set).toHaveBeenCalledTimes(1);
  });

  it("propagates photo assignment failure and permits retry", async () => {
    vi.mocked(homeLocationService.set).mockResolvedValueOnce(location).mockRejectedValueOnce(new Error("Assignment failed"));
    await act(async () => { await expect(home.save.mutateAsync(location)).rejects.toThrow("Assignment failed"); });
    await act(async () => { await home.applyToPhotos.mutateAsync(location); });
    expect(homeLocationService.set).toHaveBeenLastCalledWith(location, true);
    expect(client.getQueryData(homeLocationKeys.byUser("owner"))).toEqual(location);
  });

  it("clears cached home after a successful clear", async () => {
    client.setQueryData(homeLocationKeys.byUser("owner"), location);
    await act(async () => { await home.clear.mutateAsync(); });
    expect(homeLocationService.clear).toHaveBeenCalledOnce();
    expect(client.getQueryData(homeLocationKeys.byUser("owner"))).toBeNull();
  });
});
