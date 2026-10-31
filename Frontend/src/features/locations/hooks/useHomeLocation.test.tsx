// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeLocationPhotoConfirmation } from "../components/HomeLocationPhotoConfirmation";
import { homeLocationService } from "../services/homeLocationService";
import { homeLocationKeys, useHomeLocation } from "./useHomeLocation";

const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../../../components/ui", () => ({
  showToast: toasts,
  ConfirmationDialog: ({ title, children, onConfirm, onClose }: {
    title: string; children: ReactNode; onConfirm: () => Promise<void>; onClose: () => void;
  }) => (
    <div role="dialog">
      <h2>{title}</h2>
      {children}
      <button data-confirm onClick={() => {
        void onConfirm().then(onClose, toasts.error);
      }}>Continue</button>
      <button data-cancel onClick={onClose}>Cancel</button>
    </div>
  ),
}));
vi.mock("../services/homeLocationService", () => ({
  homeLocationService: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
}));

let home: ReturnType<typeof useHomeLocation>;
const location = { latitude: 0, longitude: -120 };

function Harness() {
  home = useHomeLocation("owner");
  return (
    <HomeLocationPhotoConfirmation
      location={home.photosHomeLocation}
      onConfirm={(value) => home.applyToPhotos.mutateAsync(value)}
      onClose={home.dismissPhotosConfirmation}
    />
  );
}

describe("Home photo confirmation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  const settle = async () => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  };
  const save = async () => {
    await act(async () => { await home.save.mutateAsync(location); });
    await settle();
  };
  const confirm = async () => {
    await act(async () => container.querySelector<HTMLButtonElement>("[data-confirm]")!.click());
    await settle();
  };

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.resetAllMocks();
    vi.mocked(homeLocationService.get).mockResolvedValue(null);
    vi.mocked(homeLocationService.set).mockImplementation(async (value) => value);
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(
      <QueryClientProvider client={client}><Harness /></QueryClientProvider>,
    ));
    await settle();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it("saves Home before asking to update existing photos", async () => {
    await save();
    expect(homeLocationService.set).toHaveBeenCalledExactlyOnceWith(location);
    expect(client.getQueryData(homeLocationKeys.byUser("owner"))).toEqual(location);
    expect(container.textContent).toContain("Use Home for photos without a location?");
  });

  it("keeps Home and leaves photos unchanged when cancelled", async () => {
    await save();
    await act(async () => container.querySelector<HTMLButtonElement>("[data-cancel]")!.click());
    expect(homeLocationService.set).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(homeLocationKeys.byUser("owner"))).toEqual(location);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("assigns photos only after consent and refreshes media and albums", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await save();
    await confirm();
    expect(homeLocationService.set).toHaveBeenLastCalledWith(location, true);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["media"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["albums"] });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(toasts.success).toHaveBeenCalledWith("Home assigned to photos without a location.");
  });

  it("does not prompt when changing an existing Home", async () => {
    vi.mocked(homeLocationService.get).mockResolvedValue({ latitude: 21, longitude: 105 });
    await save();
    expect(homeLocationService.set).toHaveBeenCalledExactlyOnceWith(location);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("does not save when the previous Home state cannot be checked", async () => {
    vi.mocked(homeLocationService.get).mockRejectedValueOnce(new Error("Home unavailable"));
    await act(async () => { await expect(home.save.mutateAsync(location)).rejects.toThrow("Home unavailable"); });
    expect(homeLocationService.set).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("keeps confirmation open after failure and supports retry", async () => {
    await save();
    vi.mocked(homeLocationService.set).mockRejectedValueOnce(new Error("Assignment failed"));
    await confirm();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(toasts.error).toHaveBeenCalled();
    expect(toasts.success).not.toHaveBeenCalled();
    await confirm();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
