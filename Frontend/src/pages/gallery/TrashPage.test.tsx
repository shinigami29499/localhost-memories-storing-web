// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
import { mediaService } from "../../features/media/services/mediaService";
import type { MediaFile } from "../../features/media/types";
import { TrashPage } from "./TrashPage";

vi.mock("motion/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("motion/react")>(),
  useInView: () => true,
}));

vi.mock("../../features/media/services/mediaService", () => ({
  mediaService: {
    deleted: vi.fn(),
    restore: vi.fn(),
    permanentlyDelete: vi.fn(),
  },
}));
vi.mock("../../components/ui/ConfirmationDialog", () => ({
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
vi.mock("@animate-ui/react/primitives/carousel", () => ({
  default: () => [() => {}, undefined],
  CarouselCounter: () => null,
  CarouselDots: () => null,
}));

const trashedMedia: MediaFile = {
  id: "trashed-id",
  mediaKind: "image",
  mimeType: "image/png",
  originalFilename: "deleted.png",
  fileSizeBytes: 120,
  createdAt: "2026-10-28T00:00:00Z",
  isFavorited: false,
};
const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

describe("TrashPage", () => {
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
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = true; }) });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.open = false; }) });
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    vi.mocked(mediaService.deleted).mockResolvedValue({
      offset: 0,
      limit: 20,
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
            <AnimateUIProvider reducedMotion="always"><TrashPage /></AnimateUIProvider>
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

  it("shows only one retry action when loading more deleted media fails", async () => {
    let intersect = () => {};
    vi.stubGlobal("IntersectionObserver", class {
      constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {}
      observe(element: Element) {
        if (element.getAttribute("aria-hidden") === "true") {
          intersect = () => this.callback([{ isIntersecting: true }]);
        }
      }
      unobserve() {}
      disconnect() {}
    });
    vi.mocked(mediaService.deleted).mockResolvedValueOnce({ offset: 0, limit: 20, total: 2, items: [trashedMedia] })
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await renderPage();
    await act(async () => intersect());
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toBe("Could not load more media."));
    expect(container.querySelectorAll(".error-state")).toHaveLength(1);
    expect(Array.from(container.querySelectorAll("button")).filter((button) => button.textContent === "Try again")).toHaveLength(1);
  });

  it("opens a trash carousel with restore/delete instead of heart/save", async () => {
    await renderPage();
    expect(mediaService.deleted).toHaveBeenCalledWith(0, 20, undefined);
    expect(Array.from(container.querySelectorAll(".gallery-page__filter")).map((button) => button.textContent))
      .toEqual(["All", "Images", "Videos"]);
    expect(container.querySelector(".pagination")).toBeNull();
    expect(container.querySelector(".media-card__name")).toBeNull();
    expect(container.querySelector(".gallery-page--trash")).not.toBeNull();
    expect(container.querySelector("img")?.src).toContain("includeDeleted=true");
    await click("Open deleted.png");
    const viewer = container.querySelector("dialog")!;
    expect(viewer.open).toBe(true);
    expect(viewer.querySelector("img")?.src).toContain("includeDeleted=true");
    expect(viewer.querySelector('[aria-label="Add to favorites"]')).toBeNull();
    expect(viewer.querySelector('[aria-label="Save to album"]')).toBeNull();
    await click("Restore");
    expect(container.querySelector("dialog")).toBeNull();
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Restore media?");
    expect(mediaService.restore).not.toHaveBeenCalled();
    await confirm();
    await vi.waitFor(() => expect(mediaService.restore).toHaveBeenCalledWith("trashed-id"));
  });

  it("filters trash by media kind and includes all kinds by default", async () => {
    vi.mocked(mediaService.deleted).mockResolvedValue({
      offset: 0,
      limit: 20,
      total: 1,
      items: [{ ...trashedMedia, mediaKind: "video", mimeType: "video/mp4", originalFilename: "deleted.mp4" }],
    });
    await renderPage();

    const filter = (label: string) => Array.from(container.querySelectorAll<HTMLButtonElement>(".gallery-page__filter"))
      .find((button) => button.textContent === label)!;
    expect(container.querySelector("h1")?.textContent).toBe("Trash.");
    expect(container.querySelector(".media-tile")?.getAttribute("aria-label")).toBe("Open deleted.mp4");
    expect(mediaService.deleted).toHaveBeenCalledWith(0, 20, undefined);

    await act(async () => {
      filter("Images").dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      filter("Images").click();
    });
    await vi.waitFor(() => expect(mediaService.deleted).toHaveBeenLastCalledWith(0, 20, "image"));

    await act(async () => {
      filter("All").dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      filter("All").click();
    });
    await vi.waitFor(() => expect(mediaService.deleted).toHaveBeenLastCalledWith(0, 20, undefined));
  });

  it("permanently deletes only the currently viewed item after confirmation", async () => {
    vi.mocked(mediaService.deleted).mockResolvedValue({
      offset: 0, limit: 20, total: 2,
      items: [trashedMedia, { ...trashedMedia, id: "second", originalFilename: "second.png" }],
    });
    await renderPage();
    await click("Open second.png");
    await click("Permanently delete");
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Permanently delete media?");
    expect(mediaService.permanentlyDelete).not.toHaveBeenCalled();
    await confirm();
    expect(mediaService.permanentlyDelete).toHaveBeenCalledExactlyOnceWith("second");
  });

  it.each(["Restore", "Permanently delete"])("applies bulk %s and exits selection", async (label) => {
    vi.mocked(mediaService.deleted).mockResolvedValue({
      offset: 0, limit: 20, total: 2,
      items: [trashedMedia, { ...trashedMedia, id: "second", originalFilename: "second.png" }],
    });
    await renderPage();
    await select();
    await click("Select second.png");
    expect(container.querySelectorAll('[aria-pressed="true"].media-tile')).toHaveLength(2);
    await click(label);
    await confirm();
    const service = label === "Restore" ? mediaService.restore : mediaService.permanentlyDelete;
    expect(service).toHaveBeenCalledTimes(2);
    expect(service).toHaveBeenCalledWith("trashed-id");
    expect(service).toHaveBeenCalledWith("second");
    expect(container.querySelector(".gallery-selection-bar")).toBeNull();
  });

  it("exits selection when the decision is canceled", async () => {
    await renderPage();
    await select();
    await click("Permanently delete");
    await act(async () => container.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')[1].click());
    expect(mediaService.permanentlyDelete).not.toHaveBeenCalled();
    expect(container.querySelector(".gallery-selection-bar")).toBeNull();
  });

  it("keeps failed items for retry without repeating successful requests", async () => {
    vi.mocked(mediaService.deleted).mockResolvedValue({
      offset: 0, limit: 20, total: 2,
      items: [trashedMedia, { ...trashedMedia, id: "second", originalFilename: "second.png" }],
    });
    vi.mocked(mediaService.restore)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Restore failed"))
      .mockResolvedValueOnce(undefined);
    await renderPage();
    await select();
    await click("Select second.png");
    await click("Restore");
    await confirm();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Restore failed");
    expect(container.querySelector(".gallery-selection-bar")).not.toBeNull();
    await confirm();
    expect(vi.mocked(mediaService.restore).mock.calls.map(([id]) => id)).toEqual(["trashed-id", "second", "second"]);
    expect(container.querySelector(".gallery-selection-bar")).toBeNull();
  });
});
