// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { MobileAlbumFormDialog } from "../../../../../../apps/mobile/src/gallery/MobileAlbumFormDialog";
import { useAnimationStore } from "../../../../../../src/store/animationStore";

vi.mock("../../../../../../src/features/media/hooks/usePreviewDrafts", () => ({ usePreviewDrafts: () => ({ register: vi.fn(), retain: vi.fn() }) }));

it("blocks closing the mobile album form during a save", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  useAnimationStore.setState({ enabled: false, iconsEnabled: false });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  let finish!: () => void;
  const onSubmit = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const onClose = vi.fn();
  await act(async () => root.render(<QueryClientProvider client={client}><MobileAlbumFormDialog onSubmit={onSubmit} onClose={onClose} /></QueryClientProvider>));
  const input = document.querySelector<HTMLInputElement>(".album-form__field input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "My album");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(onSubmit).toHaveBeenCalledWith({ name: "My album", isPublic: false, previewMediaId: null });
  expect(document.querySelector<HTMLButtonElement>('button[aria-label="Cancel action"]')?.disabled).toBe(true);
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(onClose).toHaveBeenCalledOnce();
  await act(async () => root.unmount());
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
});
