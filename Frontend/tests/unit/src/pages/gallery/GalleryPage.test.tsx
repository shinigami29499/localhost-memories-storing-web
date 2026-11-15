// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../../../../src/context/LocaleContext";
import { showToast } from "../../../../../src/components/ui/Toast";
import { albumService } from "../../../../../src/features/albums/services/albumService";
import { mediaService } from "../../../../../src/features/media/services/mediaService";
import { PageActionBarProvider } from "../../../../../src/components/layout/PageActionBar";
import type { MediaFile, MediaKindFilter, PagedMedia } from "../../../../../src/features/media/types";
import { useAuthStore } from "../../../../../src/store/authStore";
import { GalleryPage, type GalleryView } from "../../../../../src/pages/gallery/GalleryPage";


vi.mock("../../../../../src/features/media/services/mediaService", () => ({
  mediaService: {
    list: vi.fn(),
    favorites: vi.fn(),
    favorite: vi.fn(),
    unfavorite: vi.fn(),
    setFavorites: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("../../../../../src/features/albums/components/BulkSaveToAlbumDialog", () => ({
  BulkSaveToAlbumDialog: ({ onSaved, onClose }: { onSaved?: () => void; onClose: () => void }) => (
    <>
      <button type="button" onClick={() => onSaved?.()}>Confirm save</button>
      <button type="button" onClick={onClose}>Done</button>
    </>
  ),
}));
vi.mock("../../../../../src/features/albums/services/albumService", () => ({
  albumService: { list: vi.fn(), membership: vi.fn() },
}));
vi.mock("../../../../../src/components/ui/ConfirmationDialog", () => ({
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
  originalFilename: "photo.png",
  createdAt: "2026-10-28T00:00:00Z",
  isFavorited: false,
};
const video: MediaFile = { ...image, id: "video-id", mediaKind: "video", originalFilename: "clip.mp4" };
const page = (items: MediaFile[]): PagedMedia => ({ offset: 0, total: items.length, items });

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
    vi.stubGlobal("IntersectionObserver", class {
      constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {}
      observe(element: Element) {
        if (element.matches(".gallery-day-row")) this.callback([{ isIntersecting: true }]);
      }
      unobserve() {}
      disconnect() {}
    });
    vi.mocked(albumService.list).mockResolvedValue([]);
    vi.mocked(albumService.membership).mockResolvedValue({ items: [] });
    vi.mocked(mediaService.setFavorites).mockResolvedValue(undefined);
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

  async function renderPage(view: GalleryView = "pictures", initialFilter?: MediaKindFilter) {
    await act(async () => root.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <LocaleProvider><PageActionBarProvider><GalleryPage view={view} initialFilter={initialFilter} /></PageActionBarProvider></LocaleProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    ));
  }

  it("loads all media kinds by default", async () => {
    await renderPage();
    await vi.waitFor(() => expect(container.querySelectorAll(".media-tile")).toHaveLength(1));
    expect(container.querySelector(".media-tile")?.getAttribute("aria-label")).toBe("Open photo.png");
    expect(mediaService.list).toHaveBeenCalledWith(0, 20, undefined, expect.any(AbortSignal));
    expect(mediaService.favorites).not.toHaveBeenCalled();
  });

  it("updates gallery page size when the viewport crosses the mobile breakpoint", async () => {
    let mobile = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      get matches() { return query === "(max-width: 767px)" && mobile; },
      media: query,
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    })));
    await renderPage();
    await vi.waitFor(() => expect(mediaService.list).toHaveBeenCalledWith(0, 20, undefined, expect.any(AbortSignal)));

    await act(async () => {
      mobile = true;
      listeners.forEach((listener) => listener());
    });
    await vi.waitFor(() => expect(mediaService.list).toHaveBeenCalledWith(0, 5, undefined, expect.any(AbortSignal)));
    await act(async () => {
      mobile = false;
      listeners.forEach((listener) => listener());
    });
    await vi.waitFor(() => expect(mediaService.list).toHaveBeenLastCalledWith(0, 20, undefined, expect.any(AbortSignal)));
  });

  it.each(["image", "video"] as const)("requests the selected %s kind", async (kind) => {
    vi.mocked(mediaService.list).mockResolvedValue(page([kind === "image" ? image : video]));
    await renderPage("pictures", kind);
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).not.toBeNull());
    expect(mediaService.list).toHaveBeenCalledWith(0, 20, kind, expect.any(AbortSignal));
  });

  it("links to favorites from the gallery action bar", async () => {
    await renderPage();
    await vi.waitFor(() => expect(container.querySelector('[aria-label="Favorites"]')).not.toBeNull());
    expect(container.querySelector('[aria-label="Favorites"]')?.getAttribute("href")).toBe("/gallery/favorites");
  });

  it("colors the favorites action heart when viewing favorites", async () => {
    await act(async () => root.render(
      <PageActionBarProvider>
        <MemoryRouter>
          <QueryClientProvider client={client}>
            <LocaleProvider><GalleryPage view="favorites" /></LocaleProvider>
          </QueryClientProvider>
        </MemoryRouter>
      </PageActionBarProvider>,
    ));
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).not.toBeNull());
    const favoritesAction = container.querySelector<HTMLAnchorElement>(".gallery-selection-bar__action--favorite-active");

    expect(favoritesAction).not.toBeNull();
    expect(favoritesAction?.getAttribute("aria-label")).toBe("Gallery");
    expect(favoritesAction?.querySelector("svg")?.getAttribute("fill")).toBe("currentColor");
  });

  it("shows only the pagination retry after loading more fails", async () => {
    let intersect: (() => void) | undefined;
    vi.stubGlobal("IntersectionObserver", class {
      constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {}
      observe(element: Element) {
        if (element.matches(".gallery-day-row")) this.callback([{ isIntersecting: true }]);
        if (element.matches(".gallery-page__tab-panel--media > div[aria-hidden=true]:not([class])")) {
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
    await vi.waitFor(() => expect(intersect).toBeDefined());
    await act(async () => intersect!());
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toBe("Could not load more media."));
    expect(container.querySelectorAll(".error-state")).toHaveLength(1);
    expect(Array.from(container.querySelectorAll("button")).filter((button) => button.textContent === "Try again")).toHaveLength(1);

    vi.mocked(mediaService.list).mockResolvedValueOnce({ offset: 1, total: 2, items: [{ ...image, id: "second" }] });
    await act(async () => container.querySelector<HTMLButtonElement>(".error-state button")!.click());
    await vi.waitFor(() => expect(container.querySelectorAll(".media-tile")).toHaveLength(2));
    expect(container.querySelector(".error-state")).toBeNull();
    expect(mediaService.list).toHaveBeenLastCalledWith(1, 20, undefined, expect.any(AbortSignal));
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

  it.each(["image", "video"] as const)("requests favorite %s media", async (kind) => {
    await renderPage("favorites", kind);
    await vi.waitFor(() => expect(container.querySelectorAll(".media-tile")).toHaveLength(1));
    expect(mediaService.favorites).toHaveBeenCalledWith(0, 20, kind, expect.any(AbortSignal));
  });

  it.each([1, 4, 5, 6, 10, 11, 12])(
    "renders a virtualized gallery for %i items",
    async (count) => {
      vi.mocked(mediaService.list).mockResolvedValue(page(
        Array.from({ length: count }, (_, index) => ({ ...image, id: `image-${index}` })),
      ));
      await renderPage();
      await vi.waitFor(() => expect(container.querySelectorAll(".media-tile").length).toBeGreaterThan(0));
      expect(container.querySelectorAll(".media-tile").length).toBeLessThanOrEqual(count);
      expect(container.querySelector(".gallery-date-grid--virtual")).not.toBeNull();
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
    expect(container.querySelectorAll(".gallery-date-grid")[0].querySelectorAll(".media-tile")).toHaveLength(2);
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
    await act(async () => container.querySelector<HTMLElement>(".gallery-page")!.click());
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

  it("does not favorite on double-click", async () => {
    await renderPage();
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).not.toBeNull());
    const tile = container.querySelector<HTMLButtonElement>(".media-tile")!;
    await act(async () => tile.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, detail: 2 })));
    expect(mediaService.favorite).not.toHaveBeenCalled();
    expect(mediaService.unfavorite).not.toHaveBeenCalled();
  });

  it("refreshes cached gallery and album views after favoriting and undoing", async () => {
    const favorite = vi.spyOn(mediaService, "favorite").mockResolvedValue();
    const unfavorite = vi.spyOn(mediaService, "unfavorite").mockResolvedValue();
    const success = vi.spyOn(showToast, "success");
    const favoriteKey = ["media", "favorites", "image", 20] as const;
    const albumKey = ["albums", "detail", "cached-album"] as const;
    const favorites = { pages: [page([])], pageParams: [0] };
    const album = { id: "cached-album" };

    await renderPage();
    await vi.waitFor(() => expect(container.querySelector(".media-tile")).not.toBeNull());
    client.setQueryData(favoriteKey, favorites);
    client.setQueryData(albumKey, album);

    await act(async () => container.querySelector<HTMLButtonElement>(".media-tile")!.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "f" }),
    ));
    await vi.waitFor(() => expect(success).toHaveBeenCalled());
    expect(favorite).toHaveBeenCalledExactlyOnceWith(image.id);
    expect(client.getQueryState(favoriteKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(albumKey)?.isInvalidated).toBe(true);

    client.setQueryData(favoriteKey, favorites);
    client.setQueryData(albumKey, album);
    const options = success.mock.calls.at(-1)?.[1];
    const undo = typeof options === "object" ? options.undo : undefined;
    if (!undo) throw new Error("Missing favorite undo action.");
    await act(async () => { await undo(); });

    expect(unfavorite).toHaveBeenCalledExactlyOnceWith(image.id);
    expect(client.getQueryState(favoriteKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(albumKey)?.isInvalidated).toBe(true);
  });

  it("retains selection and reports an error when the bulk favorite request fails", async () => {
    const second = { ...image, id: "second-id", isFavorited: true };
    vi.mocked(mediaService.list).mockResolvedValue(page([{ ...image, isFavorited: true }, second]));
    vi.mocked(mediaService.setFavorites).mockRejectedValueOnce(new Error("offline"));
    const success = vi.spyOn(showToast, "success");
    const error = vi.spyOn(showToast, "error");
    await renderPage();
    await vi.waitFor(() => expect(container.querySelectorAll(".media-tile")).toHaveLength(2));
    const tiles = container.querySelectorAll<HTMLButtonElement>(".media-tile");
    await act(async () => tiles[0].dispatchEvent(new KeyboardEvent("keydown", { key: " ", shiftKey: true, bubbles: true })));
    await act(async () => tiles[1].click());
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Remove from favorites"]')!.click());
    await vi.waitFor(() => expect(error).toHaveBeenCalledWith("Could not update favorites.", "offline"));
    expect(mediaService.setFavorites).toHaveBeenCalledWith([image.id, second.id], false);
    expect(success).not.toHaveBeenCalled();
    expect(container.textContent).toContain("2 selected");
  });

  it("keeps selected state when undoing a bulk favorite request fails", async () => {
    const second = { ...image, id: "second-id", isFavorited: true };
    vi.mocked(mediaService.list).mockResolvedValue(page([{ ...image, isFavorited: true }, second]));
    vi.mocked(mediaService.setFavorites).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("offline"));
    const success = vi.spyOn(showToast, "success");
    await renderPage();
    await vi.waitFor(() => expect(container.querySelectorAll(".media-tile")).toHaveLength(2));
    const tiles = container.querySelectorAll<HTMLButtonElement>(".media-tile");
    await act(async () => tiles[0].dispatchEvent(new KeyboardEvent("keydown", { key: " ", shiftKey: true, bubbles: true })));
    await act(async () => tiles[1].click());
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Remove from favorites"]')!.click());
    await vi.waitFor(() => expect(success).toHaveBeenCalled());
    const options = success.mock.calls.at(-1)?.[1];
    const undo = typeof options === "object" ? options.undo : undefined;
    if (!undo) throw new Error("Missing bulk favorite undo action.");
    await act(async () => { await expect(undo()).rejects.toThrow("offline"); });
    expect(mediaService.setFavorites).toHaveBeenLastCalledWith([image.id, second.id], true);
    expect(container.textContent).toContain("2 selected");
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
    vi.mocked(albumService.membership).mockResolvedValue({ items: [{ mediaId: image.id, albumIds: ["album"] }] });
    vi.mocked(albumService.list).mockResolvedValue([{
      id: "album", name: "Saved", caption: "", isPublic: false,
      owner: { id: "viewer", username: "viewer" }, mediaCount: 1,
      previewMediaId: null, previewIsFavorited: false, customPreviewMediaId: null, containsMedia: true,
      createdAt: "",
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
