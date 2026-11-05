// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SaveToAlbumDialog } from "./SaveToAlbumDialog";
import { BulkSaveToAlbumDialog } from "./BulkSaveToAlbumDialog";
import type { Album } from "../types";

const mocks = vi.hoisted(() => ({
  removeMedia: vi.fn(),
  removeMediaBatch: vi.fn(),
  addMedia: vi.fn(),
  addMediaBatch: vi.fn(),
  invalidate: vi.fn(),
  saved: true,
}));

const album: Album = {
  id: "album-1",
  name: "Summer",
  caption: "",
  isPublic: false,
  owner: { id: "owner", username: "owner" },
  mediaCount: 2,
  previewMediaId: null,
  customPreviewMediaId: null,
  previewIsFavorited: false,
  containsMedia: true,
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: null,
};

vi.mock("../hooks/useAlbums", () => ({
  useInfiniteAlbums: () => ({
    data: { pages: [{ items: [album] }] },
    isPending: false,
    isError: false,
  }),
  useAlbumMembership: (mediaIds: string[]) => ({
    data: { items: mediaIds.map((mediaId) => ({ mediaId, albumIds: mocks.saved ? [album.id] : [] })) },
    isPending: false,
    isError: false,
  }),
  useInvalidateAlbums: () => mocks.invalidate,
}));

vi.mock("../services/albumService", () => ({
  albumService: {
    removeMedia: mocks.removeMedia,
    removeMediaBatch: mocks.removeMediaBatch,
    addMedia: mocks.addMedia,
    addMediaBatch: mocks.addMediaBatch,
  },
}));

describe.each([
  { name: "single picker", Component: SaveToAlbumDialog, mediaIds: ["photo-1"], remove: mocks.removeMedia, add: mocks.addMedia },
  { name: "bulk picker", Component: BulkSaveToAlbumDialog, mediaIds: ["photo-1", "photo-2"], remove: mocks.removeMediaBatch, add: mocks.addMediaBatch },
])("$name deletion validation", ({ Component, mediaIds, remove, add }) => {
  let container: HTMLDivElement;
  let root: Root;
  const onClose = vi.fn();

  const settle = async () => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
  };
  const click = async (label: string) => {
    const button = Array.from(document.querySelectorAll("button")).find((element) => element.textContent === label);
    expect(button).toBeDefined();
    await act(async () => button!.click());
    await settle();
  };
  const chooseAlbum = async () => {
    await act(async () => {
      const button = document.querySelector<HTMLButtonElement>(".album-picker__item")!;
      button.focus();
      button.click();
    });
    await settle();
  };

  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.resetAllMocks();
    mocks.saved = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<Component mediaIds={mediaIds} onClose={onClose} />));
    await settle();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("requires confirmation and focuses Cancel before removing saved media", async () => {
    await chooseAlbum();
    expect(remove).not.toHaveBeenCalled();
    const dialog = document.querySelector('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain(`Remove ${mediaIds.length} media items from “Summer”`);
    expect(dialog.textContent).toContain("remain in your gallery");
    expect(document.activeElement?.textContent).toBe("Cancel");
    await click("Remove from album");
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(album.id, mediaIds.length === 1 ? mediaIds[0] : mediaIds);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cancels without removing media or closing the picker", async () => {
    await chooseAlbum();
    await click("Cancel");
    expect(remove).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.querySelector(".album-picker")).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.querySelector(".album-picker__item"));
  });

  it("keeps failures open and permits retry", async () => {
    remove.mockRejectedValueOnce(new Error("Unavailable"));
    await chooseAlbum();
    await click("Remove from album");
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    await click("Remove from album");
    expect(remove).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("blocks duplicate removal and dismissal during a write", async () => {
    let finish!: () => void;
    remove.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
    await chooseAlbum();
    await click("Remove from album");
    await click("Remove from album");
    await click("Cancel");
    expect(remove).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    await act(async () => finish());
    await settle();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("still saves unsaved media without a deletion confirmation", async () => {
    mocks.saved = false;
    await act(async () => root.render(<Component mediaIds={mediaIds} onClose={onClose} />));
    await chooseAlbum();
    expect(add).toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });
});
