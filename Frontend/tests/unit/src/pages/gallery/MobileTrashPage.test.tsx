// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../../../src/context/LocaleContext";
import { mediaService } from "../../../../../src/features/media/services/mediaService";
import type { MediaFile } from "../../../../../src/features/media/types";
import { MobileTrashPage } from "../../../../../apps/mobile/src/trash/MobileTrashPage";
import { TrashPage as WebTrashPage } from "../../../../../apps/web/src/pages/gallery/TrashPage";
import { PageActionBarProvider } from "../../../../../src/components/layout/PageActionBar";
import { showToast } from "../../../../../src/components/ui/Toast";


vi.mock("motion/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("motion/react")>(),
  useInView: () => true,
}));

vi.mock("../../../../../src/features/media/services/mediaService", () => ({
  mediaService: {
    deleted: vi.fn(),
    restore: vi.fn(),
    remove: vi.fn(),
    permanentlyDelete: vi.fn(),
  },
}));
vi.mock("../../../../../src/components/ui/ConfirmationDialog", () => ({
  ConfirmationDialog: ({ onConfirm, onClose, title }: { onConfirm: () => Promise<void>; onClose: () => void; title: string }) => {
    const [error, setError] = useState<string | null>(null);
    return (
      <div role="dialog">
        <span>{title}</span>
        <button type="button" onClick={async () => {
          try {
            await onConfirm();
            onClose();
          } catch (error) {
            setError(error instanceof Error ? error.message : "Action failed");
          }
        }}>Confirm action</button>
        <button type="button" onClick={onClose}>Cancel action</button>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    );
  },
}));
vi.mock("../../../../../apps/mobile/src/gallery/MobileConfirmationDialog", async () => ({
  MobileConfirmationDialog: (await import("../../../../../src/components/ui/ConfirmationDialog")).ConfirmationDialog,
}));
vi.mock("@animate-ui/react/primitives/carousel", () => ({
  default: () => [() => {}, undefined],
  CarouselCounter: () => null,
  CarouselDots: () => null,
}));

const trashedMedia: MediaFile = {
  id: "trashed-id",
  mediaKind: "image",
  originalFilename: "deleted.png",
  createdAt: "2026-10-28T00:00:00Z",
  isFavorited: false,
};
const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

describe.each([["mobile", MobileTrashPage], ["web", WebTrashPage]] as const)("%s TrashPage", (_name, TrashPage) => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("SVGGeometryElement", class extends SVGElement {});
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("IntersectionObserver", class {
      constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {}
      observe(element: Element) {
        if (element.matches(".gallery-day-row")) this.callback([{ isIntersecting: true }]);
      }
      unobserve() {}
      disconnect() {}
    });
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = true; }) });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = false; }) });
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    vi.mocked(mediaService.deleted).mockResolvedValue({
      offset: 0,
      total: 1,
      items: [trashedMedia],
    });
    vi.mocked(mediaService.restore).mockResolvedValue(undefined);
    vi.mocked(mediaService.permanentlyDelete).mockResolvedValue(undefined);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalScrollIntoView) Object.defineProperty(Element.prototype, "scrollIntoView", originalScrollIntoView);
    else Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  });

  async function renderPage() {
    await act(async () => root.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <LocaleProvider>
            <AnimateUIProvider reducedMotion="always"><PageActionBarProvider><TrashPage /></PageActionBarProvider></AnimateUIProvider>
          </LocaleProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    ));
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).not.toBeNull());
  }

  async function click(label: string) {
    await act(async () => container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click());
  }

  async function confirm() {
    await act(async () => container.querySelector<HTMLButtonElement>('[role="dialog"] button')!.click());
  }

  async function select(id = trashedMedia.id) {
    await act(async () => container.querySelector(`[data-media-id="${id}"]`)!.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", shiftKey: true, bubbles: true }),
    ));
  }


  it("returns focus to the originating tile after closing the preview", async () => {
    await renderPage();
    const tile = container.querySelector<HTMLButtonElement>('[data-media-id="trashed-id"]')!;
    await act(async () => tile.click());
    const close = container.querySelector<HTMLButtonElement>('button[aria-label="Close image preview"]')!;
    expect(close).not.toBeNull();
    await act(async () => close.click());
    await vi.waitFor(() => expect(document.activeElement).toBe(tile));
  });
  it.each(["cancel", "retry"] as const)("keeps Undo after partial restore and %s", async (decision) => {
    const success = vi.spyOn(showToast, "success");
    vi.mocked(mediaService.deleted).mockResolvedValue({
      offset: 0, total: 2,
      items: [trashedMedia, { ...trashedMedia, id: "second", originalFilename: "second.png" }],
    });
    vi.mocked(mediaService.restore).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Restore failed")).mockResolvedValueOnce(undefined);
    vi.mocked(mediaService.remove).mockResolvedValue(undefined);
    await renderPage();
    await select();
    await click("Select second.png");
    await vi.waitFor(() => expect(container.querySelector('button[aria-label="Restore"]')).not.toBeNull());
    await click("Restore");
    await confirm();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Restore failed");
    if (decision === "cancel") await act(async () => container.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')[1].click());
    else await confirm();
    expect(success).toHaveBeenCalledTimes(1);
    const options = success.mock.calls[0]?.[1];
    await act(async () => { if (typeof options === "object") await options?.undo?.(); });
    expect(vi.mocked(mediaService.remove).mock.calls.map(([id]) => id)).toEqual(
      decision === "cancel" ? ["trashed-id"] : ["trashed-id", "second"],
    );
  });

});
