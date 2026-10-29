// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
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
vi.mock("../../features/media/components/MediaCard", () => ({
  MediaCard: ({ media }: { media: MediaFile }) => (
    <article data-testid="media-card">{media.originalFilename}</article>
  ),
}));
vi.mock("../../features/albums/components/BulkSaveToAlbumDialog", () => ({
  BulkSaveToAlbumDialog: () => null,
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
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
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
    await vi.waitFor(() => expect(container.querySelectorAll('[data-testid="media-card"]')).toHaveLength(1));

    expect(container.textContent).toContain("photo.png");
    expect(mediaService.list).toHaveBeenCalledWith(0, 20, "image");
    expect(mediaService.favorites).not.toHaveBeenCalled();
  });

  it("filters favorites by media kind", async () => {
    await renderPage("favorites");
    await vi.waitFor(() => expect(container.querySelectorAll('[data-testid="media-card"]')).toHaveLength(2));
    const videoFilter = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Video");
    await act(async () => videoFilter?.click());

    await vi.waitFor(() => expect(container.textContent).toContain("clip.mp4"));
    expect(mediaService.favorites).toHaveBeenCalledWith(0, 20, "video");
    expect(container.querySelectorAll('[data-testid="media-card"]')).toHaveLength(1);
  });
});
