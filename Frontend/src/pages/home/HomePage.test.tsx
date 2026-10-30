// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
import { albumService } from "../../features/albums/services/albumService";
import { mediaService } from "../../features/media/services/mediaService";
import { showToast } from "../../components/ui";
import type { Album } from "../../features/albums/types";
import { useAuthStore } from "../../store/authStore";
import { HomePage } from "./HomePage";

vi.mock("motion/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("motion/react")>(),
  useInView: () => true,
}));

vi.mock("../../features/albums/services/albumService", () => ({
  albumService: { list: vi.fn(), remove: vi.fn() },
}));

vi.mock("../../features/media/services/mediaService", () => ({
  mediaService: { favorite: vi.fn(), unfavorite: vi.fn() },
}));

const ownAlbum: Album = {
  id: "own-album",
  name: "My album",
  caption: "",
  isPublic: false,
  owner: { id: "viewer", username: "viewer" },
  mediaCount: 3,
  previewMediaId: "own-preview",
  previewIsFavorited: false,
  customPreviewMediaId: null,
  containsMedia: false,
  createdAt: "2026-10-28T00:00:00Z",
  updatedAt: null,
};

const publicAlbum: Album = {
  ...ownAlbum,
  id: "public-album",
  name: "Shared album",
  isPublic: true,
  owner: { id: "another-user", username: "alice" },
  previewMediaId: "public-preview",
};

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

describe("HomePage", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  const renderPage = async () => {
    await act(async () => root.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <LocaleProvider><HomePage /><LocationProbe /></LocaleProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    ));
    await vi.waitFor(() => expect(container.querySelectorAll(".album-feed-post")).toHaveLength(2));
  };
  const preview = () => container.querySelector<HTMLAnchorElement>(".album-feed-post__preview")!;
  const location = () => container.querySelector('[data-testid="location"]')?.textContent;
  const pointerClick = (element: Element, detail: number) => element.dispatchEvent(new MouseEvent("click", {
    bubbles: true, cancelable: true, detail, button: 0,
  }));
  const doubleClick = async () => {
    await act(async () => {
      pointerClick(preview(), 1);
      pointerClick(preview(), 2);
      preview().dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, detail: 2 }));
    });
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.mocked(albumService.list).mockImplementation(async (scope) => (
      scope === "mine" ? [ownAlbum] : [publicAlbum]
    ));
    vi.mocked(mediaService.favorite).mockResolvedValue(undefined);
    vi.mocked(mediaService.unfavorite).mockResolvedValue(undefined);
    vi.mocked(albumService.remove).mockResolvedValue(undefined);
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

  it("shows owned and public albums with only their preview image before opening", async () => {
    await renderPage();
    expect(container.querySelectorAll(".album-feed-post img")).toHaveLength(2);
    expect(container.querySelectorAll("video")).toHaveLength(0);
    expect(container.querySelector('a[href="/library/album/own-album"]')).not.toBeNull();
    expect(container.querySelector('a[href="/library/album/public-album"]')).not.toBeNull();
    expect(container.querySelector('img[src*="own-preview"]')).not.toBeNull();
    expect(container.querySelector('img[src*="public-preview"]')).not.toBeNull();
    expect(albumService.list).toHaveBeenCalledWith("mine", undefined);
    expect(albumService.list).toHaveBeenCalledWith("public", undefined);
  });

  it("navigates to album detail after a single pointer click", async () => {
    await renderPage();
    await act(async () => { pointerClick(preview(), 1); });
    expect(location()).toBe("/");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
    expect(location()).toBe("/library/album/own-album");
    expect(mediaService.favorite).not.toHaveBeenCalled();
  });

  it("favorites only the preview on double-click without navigating", async () => {
    await renderPage();
    await doubleClick();
    await vi.waitFor(() => expect(mediaService.favorite).toHaveBeenCalledExactlyOnceWith("own-preview"));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
    expect(location()).toBe("/");
    expect(mediaService.unfavorite).not.toHaveBeenCalled();
  });

  it("opens immediately on keyboard activation and preserves modified link clicks", async () => {
    await renderPage();
    const modifiedClick = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1, ctrlKey: true });
    await act(async () => { preview().dispatchEvent(modifiedClick); });
    expect(modifiedClick.defaultPrevented).toBe(false);
    expect(location()).toBe("/");
    await act(async () => { preview().click(); });
    expect(location()).toBe("/library/album/own-album");
  });

  it("hides favorite and save actions and does not unfavorite on double-click", async () => {
    vi.mocked(albumService.list).mockImplementation(async (scope) => (
      scope === "mine" ? [{ ...ownAlbum, previewIsFavorited: true }] : [publicAlbum]
    ));
    await renderPage();
    await doubleClick();
    expect(mediaService.favorite).not.toHaveBeenCalled();
    expect(mediaService.unfavorite).not.toHaveBeenCalled();
    const post = container.querySelector(".album-feed-post")!;
    expect(post.querySelector('[aria-label="Remove from favorites"]')).toBeNull();
    expect(post.querySelector('[aria-label="Save to album"]')).toBeNull();
  });

  it("shows deletion only for the owner, or all visible albums for an admin", async () => {
    await renderPage();
    expect(container.querySelectorAll(".album-feed-post__delete")).toHaveLength(1);
    expect(container.querySelector(".album-feed-post__header .album-feed-post__delete")).not.toBeNull();
    expect(container.querySelector('.album-feed-post__delete')?.getAttribute("aria-label")).toBe("Delete album My album");
    await act(async () => useAuthStore.setState({
      user: { ...useAuthStore.getState().user!, role: "admin" },
    }));
    expect(container.querySelectorAll(".album-feed-post__delete")).toHaveLength(2);
  });

  it("confirms album deletion without deleting media or navigating", async () => {
    await renderPage();
    await act(async () => container.querySelector<HTMLButtonElement>(".album-feed-post__delete")!.click());
    expect(albumService.remove).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Saved media stay in your gallery.");
    const confirm = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "Continue")!;
    await act(async () => confirm.click());
    await vi.waitFor(() => expect(albumService.remove).toHaveBeenCalledExactlyOnceWith("own-album"));
    expect(location()).toBe("/");
  });

  it("shows no favorite or save controls when an album has no preview, but keeps navigation", async () => {
    vi.mocked(albumService.list).mockImplementation(async (scope) => (
      scope === "mine" ? [{ ...ownAlbum, previewMediaId: null }] : [publicAlbum]
    ));
    await renderPage();
    const post = container.querySelector(".album-feed-post")!;
    expect(post.querySelectorAll('button[aria-label="Add to favorites"], button[aria-label="Save to album"]')).toHaveLength(0);
    expect(post.textContent).toContain("No preview image");
    expect(post.querySelector("img")).toBeNull();
    await doubleClick();
    expect(mediaService.favorite).not.toHaveBeenCalled();
    await act(async () => preview().click());
    expect(location()).toBe("/library/album/own-album");
  });

  it("reports favorite failures and leaves navigation and state unchanged", async () => {
    const errorToast = vi.spyOn(showToast, "error").mockImplementation(() => undefined);
    vi.mocked(mediaService.favorite).mockRejectedValue(new Error("offline"));
    await renderPage();
    await doubleClick();
    await vi.waitFor(() => expect(errorToast).toHaveBeenCalledWith("Could not update favorites."));
    expect(location()).toBe("/");
  });

  it("retries a failed preview without navigating", async () => {
    await renderPage();
    await act(async () => preview().querySelector("img")!.dispatchEvent(new Event("error")));
    expect(preview().querySelector("img")).toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Retry preview"]')!.click());
    expect(preview().querySelector("img")?.getAttribute("src")).toContain("previewRetry=1");
    expect(location()).toBe("/");
  });
});
