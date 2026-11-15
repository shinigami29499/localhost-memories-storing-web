// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { LocationEditor } from "../../../../../../src/features/locations/components/LocationEditor";
import { MobileLocationEditor } from "../../../../../../apps/mobile/src/places/MobileLocationEditor";
import { locationService } from "../../../../../../src/features/locations/services/locationService";

vi.mock("../../../../../../src/components/ui", async (original) => ({
  ...await original<typeof import("../../../../../../src/components/ui")>(),
  ConfirmationDialog: ({ onConfirm }: { onConfirm: () => Promise<void>; children: ReactNode }) =>
    <button type="button" data-confirm onClick={() => void onConfirm()}>Confirm</button>,
}));
vi.mock("../../../../../../src/features/locations/services/locationService", () => ({ locationService: { set: vi.fn() } }));
vi.mock("../../../../../../apps/mobile/src/gallery/MobileConfirmationDialog", () => ({
  MobileConfirmationDialog: ({ onConfirm }: { onConfirm: () => Promise<void> }) =>
    <button type="button" data-confirm onClick={() => void onConfirm()}>Confirm</button>,
}));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it.each([["web", LocationEditor], ["mobile", MobileLocationEditor]] as const)("%s editor confirms before saving", async (_, Editor) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.mocked(locationService.set).mockResolvedValue(undefined);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onSaved = vi.fn();
  const draft = { latitude: 1, longitude: 2 };
  await act(async () => root.render(<QueryClientProvider client={client}>
    <Editor media={{ id: "one", originalFilename: "photo.jpg", mediaKind: "image", createdAt: "2026-01-01", isFavorited: false }}
      draft={draft} onChange={vi.fn()} onSaved={onSaved} onCancel={vi.fn()} />
  </QueryClientProvider>));
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(locationService.set).not.toHaveBeenCalled();
  await act(async () => { container.querySelector<HTMLButtonElement>("[data-confirm]")!.click(); await new Promise((resolve) => setTimeout(resolve, 20)); });
  expect(locationService.set).toHaveBeenCalledWith("one", draft);
  expect(onSaved).toHaveBeenCalledOnce();
  await act(async () => root.unmount());
  client.clear();
  container.remove();
});
