// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
import { albumService } from "../../features/albums/services/albumService";
import type { Album } from "../../features/albums/types";
import { useAuthStore } from "../../store/authStore";
import { HomePage } from "./HomePage";

vi.mock("motion/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("motion/react")>(),
  useInView: () => true,
}));

vi.mock("../../features/albums/services/albumService", () => ({
  albumService: { list: vi.fn() },
}));

const ownAlbum: Album = {
  id: "own-album",
  name: "My album",
  caption: "",
  isPublic: false,
  owner: { id: "viewer", username: "viewer" },
  mediaCount: 3,
  previewMediaId: "own-preview",
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

describe("HomePage", () => {
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
    vi.mocked(albumService.list).mockImplementation(async (scope) => (
      scope === "mine" ? [ownAlbum] : [publicAlbum]
    ));
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
    await act(async () => root.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <LocaleProvider><HomePage /></LocaleProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    ));

    await vi.waitFor(() => expect(container.querySelectorAll(".album-card")).toHaveLength(2));
    expect(container.querySelectorAll(".album-card img")).toHaveLength(2);
    expect(container.querySelectorAll("video")).toHaveLength(0);
    expect(container.querySelector('a[href="/albums/own-album"]')).not.toBeNull();
    expect(container.querySelector('a[href="/albums/public-album"]')).not.toBeNull();
    expect(container.querySelector('img[src*="own-preview"]')).not.toBeNull();
    expect(container.querySelector('img[src*="public-preview"]')).not.toBeNull();
    expect(albumService.list).toHaveBeenCalledWith("mine", undefined);
    expect(albumService.list).toHaveBeenCalledWith("public", undefined);
  });
});
