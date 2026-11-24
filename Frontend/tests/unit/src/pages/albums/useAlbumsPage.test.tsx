// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useAlbumsPage } from "../../../../../src/pages/albums/useAlbumsPage";
import { albumService } from "../../../../../src/features/albums/services/albumService";

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn(), useLocation: () => ({ key: "test" }) }));
vi.mock("../../../../../src/context/LocaleContext", () => ({ useLocale: () => ({ t: (value: string) => value }) }));
vi.mock("../../../../../src/components/ui/Toast", () => ({ showToast: { error: vi.fn() } }));
vi.mock("../../../../../src/features/albums/hooks/useAlbums", () => ({ useInfiniteAlbums: () => ({ data: undefined }), useInvalidateAlbums: () => vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../../../../src/features/albums/services/albumService", () => ({ albumService: { favorite: vi.fn(), unfavorite: vi.fn() } }));

it("blocks duplicate favorites and clears feedback immediately after completion", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let finish!: () => void;
  vi.mocked(albumService.favorite).mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
  const container = document.createElement("div");
  const root = createRoot(container);
  let page!: ReturnType<typeof useAlbumsPage>;
  function Component() { page = useAlbumsPage(); return null; }
  await act(async () => root.render(<Component />));
  let first!: Promise<void>;
  await act(async () => {
    first = page.toggleFavorite("album-1", false);
    void page.toggleFavorite("album-1", false);
  });
  expect(albumService.favorite).toHaveBeenCalledTimes(1);
  expect(page.favoriteBusyAlbumId).toBe("album-1");
  await act(async () => { finish(); await first; });
  expect(page.favoriteBusyAlbumId).toBeNull();
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});
