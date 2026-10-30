// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
import { albumService } from "../../features/albums/services/albumService";
import { mediaService } from "../../features/media/services/mediaService";
import type { MediaFile, PagedMedia } from "../../features/media/types";
import { useAuthStore } from "../../store/authStore";
import { GalleryPage, type GalleryView } from "./GalleryPage";

vi.mock("../../features/media/services/mediaService", () => ({
  mediaService: {
    list: vi.fn(),
    favorites: vi.fn(),
    favorite: vi.fn(),
    unfavorite: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("../../features/albums/components/BulkSaveToAlbumDialog", () => ({
  BulkSaveToAlbumDialog: ({ onSaved, onClose }: { onSaved?: () => void; onClose: () => void }) => (
    <>
      <button type="button" onClick={() => onSaved?.()}>Confirm save</button>
      <button type="button" onClick={onClose}>Done</button>
    </>
  ),
}));
vi.mock("../../features/albums/services/albumService", () => ({
  albumService: { list: vi.fn() },
}));
vi.mock("../../components/ui/ConfirmationDialog", () => ({
  ConfirmationDialog: ({ onConfirm, onClose, title, children }: {
    onConfirm: () => Promise<void>;
    onClose: () => void;
    title: string;
    children: ReactNode;
  }) => (
    <div role="dialog">
      <span>{title}</span>
      <div>{children}</div>
      <button type="button" onClick={async () => {
        await onConfirm();
        onClose();
      }}>Confirm action</button>
      <button type="button" onClick={onClose}>Cancel action</button>
    </div>
  ),
}));

const image: MediaFile = {
  id: "image-id",
  mediaKind: "image",
  mimeType: "image/png",
  originalFilename: "photo.png",
  fileSizeBytes: 100,
  createdAt: "2026-10-28T00:00:00Z",
  isFavorited: false,
};
const video: MediaFile = { ...image, id: "video-id", mediaKind: "video", mimeType: "video/mp4", originalFilename: "clip.mp4" };
const page = (items: MediaFile[]): PagedMedia => ({ offset: 0, limit: 20, total: items.length, items });

describe("GalleryPage", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  beforeEach(() => {
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
    vi.mocked(albumService.list).mockResolvedValue([]);
    vi.mocked(mediaService.list).mockResolvedValue(page([image]));
    vi.mocked(mediaService.favorites).mockImplementation(async (_offset, _limit, kind) =>
      page(kind === "video" ? [video] : kind === "image" ? [image] : [image, video]),
    );
    useAuthStore.setState({
      accessToken: "test-token",
      user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "" },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    useAuthStore.getState().clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function renderPage(view: GalleryView = "pictures") {
    await act(async () => root.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <LocaleProvider><GalleryPage view={view} /></LocaleProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    ));
  }

  it("loads the picture library as media records", async () => {
    await renderPage();
    await vi.waitFor(() => expect(container.querySelectorAll(".media-tile")).toHaveLength(1));

    expect(container.querySelector(".media-tile")?.getAttribute("aria-label")).toBe("Open photo.png");
    expect(mediaService.list).toHaveBeenCalledWith(0, 20, "image");
    expect(mediaService.favorites).not.toHaveBeenCalled();
  });

  it("shows only the pagination retry after loading more fails", async () => {
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
    vi.mocked(mediaService.list).mockResolvedValueOnce({ ...page([image]), total: 2 })
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await renderPage();
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).not.toBeNull());
    await act(async () => intersect());
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toBe("Could not load more media."));
    expect(container.querySelectorAll(".error-state")).toHaveLength(1);
    expect(Array.from(container.querySelectorAll("button")).filter((button) => button.textContent === "Try again")).toHaveLength(1);

    vi.mocked(mediaService.list).mockResolvedValueOnce({ offset: 1, limit: 20, total: 2, items: [{ ...image, id: "second" }] });
    await act(async () => container.querySelector<HTMLButtonElement>(".error-state button")!.click());
    await vi.waitFor(() => expect(container.querySelectorAll(".media-tile")).toHaveLength(2));
    expect(container.querySelector(".error-state")).toBeNull();
    expect(mediaService.list).toHaveBeenLastCalledWith(1, 20, "image");
  });

  it("shows only the refresh retry when existing media cannot refresh", async () => {
    await renderPage();
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).not.toBeNull());
    vi.mocked(mediaService.list).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await act(async () => { await client.refetchQueries({ queryKey: ["media"] }); });
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toBe("Could not refresh media."));
    expect(container.querySelectorAll(".error-state")).toHaveLength(1);
    expect(container.querySelectorAll(".media-tile")).toHaveLength(1);
  });

  it("filters favorites by media kind", async () => {
    await renderPage("favorites");
    await vi.waitFor(() => expect(container.querySelectorAll(".media-tile")).toHaveLength(2));
    expect(Array.from(container.querySelectorAll(".gallery-page__filter")).map((button) => button.textContent))
      .toEqual(["All", "Images", "Videos"]);
    expect(container.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe("All");
    expect(mediaService.favorites).toHaveBeenCalledWith(0, 20, undefined);
    const videoFilter = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Videos");
    await act(async () => {
      videoFilter?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      videoFilter?.click();
    });

    await vi.waitFor(() => expect(container.querySelector(".media-tile")?.getAttribute("aria-label")).toBe("Open clip.mp4"));
    expect(mediaService.favorites).toHaveBeenCalledWith(0, 20, "video");
    expect(container.querySelectorAll(".media-tile")).toHaveLength(1);
  });

  it.each([
    [1, 5, 4],
    [4, 5, 4],
    [5, 5, 6],
    [6, 10, 6],
    [10, 10, 6],
    [11, 15, 6],
    [12, 15, 6],
  ])(
    "uses %i items to choose %i desktop and %i mobile columns without hiding tiles",
    async (count, desktopColumns, mobileColumns) => {
      vi.mocked(mediaService.list).mockResolvedValue(page(
        Array.from({ length: count }, (_, index) => ({ ...image, id: `image-${index}` })),
      ));
      await renderPage();
      await vi.waitFor(() => expect(container.querySelectorAll(".media-tile")).toHaveLength(count));
      const grid = container.querySelector(".gallery-date-grid");
      expect(grid?.classList.contains(`gallery-date-grid--${desktopColumns}`)).toBe(true);
      expect(grid?.getAttribute("data-mobile-columns")).toBe(String(mobileColumns));
    },
  );

  it("groups by local upload day and places newer dates first", async () => {
    vi.mocked(mediaService.list).mockResolvedValue(page([
      { ...image, id: "older", createdAt: new Date(2026, 9, 27, 23, 59).toISOString() },
      { ...image, id: "morning", createdAt: new Date(2026, 9, 28, 0, 1).toISOString() },
      { ...image, id: "evening", createdAt: new Date(2026, 9, 28, 23, 59).toISOString() },
    ]));
    await renderPage();
    await vi.waitFor(() => expect(container.querySelectorAll(".gallery-date-grid")).toHaveLength(2));
    expect(Array.from(container.querySelectorAll("time")).map((time) => time.dateTime))
      .toEqual(["2026-10-28", "2026-10-27"]);
    expect(container.querySelector(".gallery-date-grid")?.children).toHaveLength(2);
  });

  it("switches one day group to its timeline and leaves other days as grids", async () => {
    vi.mocked(mediaService.list).mockResolvedValue(page([
      { ...image, id: "older", createdAt: new Date(2026, 9, 27, 23, 59).toISOString() },
      { ...image, id: "newer", createdAt: new Date(2026, 9, 28, 0, 1).toISOString() },
    ]));
    await renderPage();
    await vi.waitFor(() => expect(container.querySelectorAll(".gallery-date-grid")).toHaveLength(2));
    expect(container.querySelectorAll(".gallery-timeline")).toHaveLength(0);

    const toggles = () => container.querySelectorAll<HTMLButtonElement>(".gallery-group__timeline-toggle");
    const sections = () => container.querySelectorAll(".gallery-groups > section");
    expect(toggles()).toHaveLength(2);

    await act(async () => toggles()[0].click());
    expect(container.querySelectorAll(".gallery-timeline")).toHaveLength(1);
    expect(sections()[0].querySelector(".gallery-timeline")).not.toBeNull();
    expect(sections()[0].querySelector(".gallery-date-grid")).toBeNull();
    expect(sections()[1].querySelector(".gallery-date-grid")).not.toBeNull();
    expect(toggles()[0].getAttribute("aria-pressed")).toBe("true");
    expect(toggles()[1].getAttribute("aria-pressed")).toBe("false");

    await act(async () => toggles()[0].click());
    expect(container.querySelectorAll(".gallery-timeline")).toHaveLength(0);
    expect(container.querySelectorAll(".gallery-date-grid")).toHaveLength(2);
  });

  it("supports selection and cancellation in Favorites", async () => {
    await renderPage("favorites");
    await vi.waitFor(() => expect(container.querySelectorAll(".media-tile")).toHaveLength(2));
    const tile = container.querySelector<HTMLButtonElement>(".media-tile")!;
    await act(async () => tile.dispatchEvent(new KeyboardEvent("keydown", {
      key: " ", shiftKey: true, bubbles: true,
    })));
    expect(tile.getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("1 selected");
    expect(container.querySelector('button[aria-label="Add to favorites"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Save to album"]')).not.toBeNull();
    const cancel = container.querySelector<HTMLButtonElement>('button[aria-label="Cancel selection"]')!;
    await act(async () => cancel.click());
    expect(tile.hasAttribute("aria-pressed")).toBe(false);
    expect(container.textContent).not.toContain("1 selected");
  });

  it("starts selection after a long press and adds tiles dragged across", async () => {
    vi.mocked(mediaService.list).mockResolvedValue(page([image, video]));
    await renderPage();
    await vi.waitFor(() => expect(container.querySelectorAll(".media-tile")).toHaveLength(2));
    const [first, second] = Array.from(container.querySelectorAll<HTMLButtonElement>(".media-tile"));
    const pointer = (tile: HTMLButtonElement, type: string, clientX = 0) => {
      tile.dispatchEvent(Object.assign(new MouseEvent(type, { bubbles: true, clientX }), {
        pointerId: 1,
        isPrimary: true,
      }));
    };

    vi.useFakeTimers();
    pointer(first, "pointerdown");
    await act(async () => vi.advanceTimersByTime(500));
    expect(first.getAttribute("aria-pressed")).toBe("true");
    await act(async () => {
      pointer(second, "pointermove", 20);
      pointer(second, "pointerup", 20);
      pointer(first, "click");
    });

    expect(first.getAttribute("aria-pressed")).toBe("true");
    expect(second.getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("2 selected");
    vi.useRealTimers();
  });

  it("moves long-pressed selections to trash after confirmation", async () => {
    await renderPage();
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).not.toBeNull());
    const tile = container.querySelector<HTMLButtonElement>(".media-tile")!;
    await act(async () => tile.dispatchEvent(new KeyboardEvent("keydown", {
      key: " ", shiftKey: true, bubbles: true,
    })));

    expect(container.querySelector('button[aria-label="Move to trash"]')).not.toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Move to trash"]')!.click());
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Move selected media to trash?");
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Selected media will move to trash");

    await act(async () => container.querySelector<HTMLButtonElement>('[role="dialog"] button')!.click());
    expect(mediaService.remove).toHaveBeenCalledExactlyOnceWith(image.id);
    expect(container.textContent).not.toContain("1 selected");
  });

  it("double-click adds a favorite without unfavoriting or opening the viewer", async () => {
    await renderPage();
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).not.toBeNull());
    const tile = container.querySelector<HTMLButtonElement>(".media-tile")!;
    await act(async () => {
      tile.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
      tile.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 2 }));
      tile.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, detail: 2 }));
    });
    expect(mediaService.favorite).toHaveBeenCalledWith(image.id);
    expect(mediaService.unfavorite).not.toHaveBeenCalled();
    expect(container.querySelector("dialog")).toBeNull();
  });

  it("keeps selected media and updates the heart after favoriting", async () => {
    await renderPage();
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).not.toBeNull());
    const tile = container.querySelector<HTMLButtonElement>(".media-tile")!;
    await act(async () => tile.dispatchEvent(new KeyboardEvent("keydown", {
      key: " ", shiftKey: true, bubbles: true,
    })));
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Add to favorites"]')!.click());
    await vi.waitFor(() => expect(
      container.querySelector('button[aria-label="Remove from favorites"]')?.getAttribute("aria-pressed"),
    ).toBe("true"));
    expect(tile.getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("1 selected");
  });

  it("retains selection after unfavoriting removes the item from Favorites results", async () => {
    vi.mocked(mediaService.favorites).mockResolvedValue(page([{ ...image, isFavorited: true }]));
    await renderPage("favorites");
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).not.toBeNull());
    await act(async () => container.querySelector(".media-tile")!.dispatchEvent(new KeyboardEvent("keydown", {
      key: " ", shiftKey: true, bubbles: true,
    })));
    vi.mocked(mediaService.favorites).mockResolvedValue(page([]));
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Remove from favorites"]')!.click());
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).toBeNull());
    expect(container.textContent).toContain("1 selected");
    expect(container.querySelector<HTMLButtonElement>('button[aria-label="Add to favorites"]')?.disabled).toBe(false);
  });

  it("marks the bookmark active and keeps the album picker and selection after saving until Done", async () => {
    vi.mocked(albumService.list).mockResolvedValue([{
      id: "album", name: "Saved", caption: "", isPublic: false,
      owner: { id: "viewer", username: "viewer" }, mediaCount: 1,
      previewMediaId: null, previewIsFavorited: false, customPreviewMediaId: null, containsMedia: true,
      createdAt: "", updatedAt: null,
    }]);
    await renderPage();
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).not.toBeNull());
    const tile = container.querySelector<HTMLButtonElement>(".media-tile")!;
    await act(async () => tile.dispatchEvent(new KeyboardEvent("keydown", {
      key: " ", shiftKey: true, bubbles: true,
    })));
    await vi.waitFor(() => expect(
      container.querySelector('button[aria-label="Save to album"]')?.getAttribute("aria-pressed"),
    ).toBe("true"));
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Save to album"]')!.click());
    await act(async () => Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Confirm save")!.click());
    expect(container.textContent).toContain("Confirm save");
    expect(tile.getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("1 selected");
    await act(async () => Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Done")!.click());
    expect(container.textContent).not.toContain("Confirm save");
    expect(tile.getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("1 selected");
  });
});
