// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { useAlbumFeedPost } from "../../../../../../src/features/albums/hooks/useAlbumFeedPost";
import type { Album } from "../../../../../../src/features/albums/types";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { fetchNextPage, remove, invalidate } = vi.hoisted(() => ({
  fetchNextPage: vi.fn(), remove: vi.fn(), invalidate: vi.fn(),
}));
vi.mock("motion/react", () => ({ useInView: () => true }));
vi.mock("../../../../../../src/features/albums/hooks/useAlbums", () => ({
  useInvalidateAlbums: () => invalidate,
  useInfiniteAlbumMedia: () => ({
    data: { pages: [{ items: [{ id: "first" }] }] },
    hasNextPage: true, isFetchingNextPage: false, fetchNextPage,
  }),
}));
vi.mock("../../../../../../src/features/albums/services/albumService", () => ({ albumService: { remove } }));

it("advances only after another media page arrives and invalidates after deletion", async () => {
  fetchNextPage.mockResolvedValue({ data: { pages: [{ items: [{ id: "first" }, { id: "second" }] }] } });
  remove.mockResolvedValue(undefined);
  invalidate.mockResolvedValue(undefined);
  const album = { id: "album", mediaCount: 2, previewMediaId: "first" } as Album;
  let state: ReturnType<typeof useAlbumFeedPost>;
  function Example() { state = useAlbumFeedPost(album); return <output>{state.imageIndex}</output>; }
  const element = document.createElement("div");
  document.body.append(element);
  const root = createRoot(element);
  await act(async () => root.render(<Example />));
  await act(async () => { await state!.nextImage(); });
  expect(element.textContent).toBe("1");
  await act(async () => { await state!.deleteAlbum(); });
  expect(remove).toHaveBeenCalledWith("album");
  expect(invalidate).toHaveBeenCalledOnce();
  await act(async () => root.unmount());
  element.remove();
});
