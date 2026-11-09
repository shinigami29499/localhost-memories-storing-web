// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoPicker } from "./PhotoPicker";
import { previewService } from "../services/previewService";
import { mediaService } from "../services/mediaService";
import { uploadService } from "../../uploads/services/uploadService";
import type { MediaFile } from "../types";
import type { UploadBatch } from "../../uploads/types";
import { useAnimationStore } from "../../../store/animationStore";

vi.mock("../services/previewService", () => ({
  previewService: { list: vi.fn(), getImage: vi.fn(), upload: vi.fn(), releaseDraft: vi.fn() },
}));
vi.mock("../services/mediaService", () => ({
  mediaService: { list: vi.fn() },
}));
vi.mock("../../uploads/services/uploadService", () => ({
  uploadService: { submit: vi.fn(), get: vi.fn() },
}));

const galleryImage: MediaFile = {
  id: "gallery-image", originalFilename: "gallery.jpg", mediaKind: "image",
  createdAt: "2026-11-01T00:00:00Z", isFavorited: false, isPreviewOnly: false,
};
const previewImage: MediaFile = { ...galleryImage, id: "preview-image", originalFilename: "cover.jpg", isPreviewOnly: true };
const newPreview: MediaFile = { ...previewImage, id: "new-preview", originalFilename: "new.jpg" };

describe("PhotoPicker", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let mounted: boolean;
  const onConfirm = vi.fn();
  const onUploadedPreview = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("SVGGeometryElement", class extends SVGElement {});
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollTo = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    mounted = true;
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    vi.mocked(mediaService.list).mockResolvedValue({ offset: 0, total: 1, items: [galleryImage] });
    vi.mocked(previewService.list).mockResolvedValue({ offset: 0, total: 1, items: [previewImage] });
    vi.mocked(previewService.upload).mockResolvedValue(newPreview);
    vi.mocked(previewService.releaseDraft).mockResolvedValue();
    useAnimationStore.setState({ enabled: true });
  });

  afterEach(async () => {
    if (mounted) await act(async () => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  const render = async (selectedId: string | null, selectedIds?: string[], maxImages?: number) => {
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <PhotoPicker selectedId={selectedId} selectedIds={selectedIds} maxImages={maxImages}
          onConfirm={onConfirm} onUploadedPreview={onUploadedPreview} onClose={onClose} />
      </QueryClientProvider>,
    ));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
  };
  const tab = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    .find((element) => element.textContent === label)!;
  const click = async (element: HTMLElement) => {
    await act(async () => {
      element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      element.click();
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
  };
  const uploadFile = async () => {
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", { configurable: true, value: [new File(["photo"], "new.jpg", { type: "image/jpeg" })] });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 25)); });
  };
  const done = () => Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === "Done")!;

  it("starts on Preview and selects the current preview even when absent from its first page", async () => {
    vi.mocked(previewService.getImage).mockResolvedValue(previewImage);
    vi.mocked(previewService.list).mockResolvedValue({ offset: 0, total: 0, items: [] });
    await render(previewImage.id);
    await vi.waitFor(() => expect(tab("Preview").getAttribute("aria-selected")).toBe("true"));
    expect(document.querySelector('[aria-label="cover.jpg"]')?.getAttribute("aria-pressed")).toBe("true");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("cover.jpg");
    expect(document.querySelector(".place-picker__count")?.textContent).toBe("1 of 1 selected");
    expect(mediaService.list).not.toHaveBeenCalled();
    await click(done());
    expect(onConfirm).toHaveBeenCalledWith(previewImage, previewImage);
  });

  it("starts on Gallery for a gallery cover and keeps preview-only images out of Gallery", async () => {
    vi.mocked(previewService.getImage).mockResolvedValue(galleryImage);
    await render(galleryImage.id);
    expect(tab("Gallery").getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector('[aria-label="gallery.jpg"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector('[aria-label="cover.jpg"]')).toBeNull();
  });

  it("keeps gallery images in place when selecting one", async () => {
    const secondImage = { ...galleryImage, id: "second-image", originalFilename: "second.jpg" };
    vi.mocked(mediaService.list).mockResolvedValue({ offset: 0, total: 2, items: [galleryImage, secondImage] });
    await render(null);
    await click(document.querySelector<HTMLButtonElement>('[aria-label="second.jpg"]')!);
    const images = [...document.querySelectorAll<HTMLButtonElement>('.place-picker__grid button[aria-pressed]')];
    expect(images.map((image) => image.getAttribute("aria-label"))).toEqual(["gallery.jpg", "second.jpg"]);
    expect(images[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("uses shared popup/backdrop fades and closes through the exit lifecycle", async () => {
    await render(null);
    expect(document.querySelector(".place-picker")?.classList.contains("custom-dialog--animated")).toBe(true);
    expect(document.querySelector(".confirmation-dialog-backdrop")?.classList.contains("custom-dialog-backdrop--animated")).toBe(true);
    await click(done());
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(document.querySelector(".place-picker")).toBeNull();
  });

  it("respects the global animation setting for popup and backdrop", async () => {
    useAnimationStore.setState({ enabled: false });
    await render(null);
    expect(document.querySelector(".place-picker")?.classList.contains("custom-dialog--animated")).toBe(false);
    expect(document.querySelector(".confirmation-dialog-backdrop")?.classList.contains("custom-dialog-backdrop--animated")).toBe(false);
  });

  it("allows replacing a temporary place cover even when its image limit is full", async () => {
    vi.mocked(previewService.getImage).mockResolvedValue(previewImage);
    await render(previewImage.id, [previewImage.id], 1);
    await click(tab("Gallery"));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 25)); });
    const image = document.querySelector<HTMLButtonElement>('[aria-label="gallery.jpg"]')!;
    expect(image.disabled).toBe(false);
    await click(image);
    await click(done());
    expect(onConfirm).toHaveBeenCalledWith(galleryImage, previewImage);
  });

  it("uploads previews without upload records, hides them on Gallery, and retains confirmed drafts for the parent", async () => {
    await render(null);
    await click(tab("Preview"));
    await uploadFile();
    expect(previewService.upload).toHaveBeenCalledOnce();
    expect(uploadService.submit).not.toHaveBeenCalled();
    expect(onUploadedPreview).toHaveBeenCalledWith(newPreview.id);
    expect(document.querySelector('[aria-label="new.jpg"]')?.getAttribute("aria-pressed")).toBe("true");
    await click(tab("Gallery"));
    expect(document.querySelector('[aria-label="new.jpg"]')).toBeNull();
    await click(tab("Preview"));
    await click(done());
    expect(onConfirm).toHaveBeenCalledWith(newPreview, null);
    await act(async () => root.unmount());
    mounted = false;
    expect(previewService.releaseDraft).not.toHaveBeenCalled();
  });

  it("releases unselected preview uploads on Done while retaining only the selected draft", async () => {
    const unused = { ...newPreview, id: "unused-preview", originalFilename: "unused.jpg" };
    vi.mocked(previewService.upload).mockResolvedValueOnce(unused).mockResolvedValueOnce(newPreview);
    await render(null);
    await click(tab("Preview"));
    await uploadFile();
    await uploadFile();
    await click(done());
    await act(async () => root.unmount());
    mounted = false;
    expect(previewService.releaseDraft).toHaveBeenCalledExactlyOnceWith(unused.id);
    expect(onConfirm).toHaveBeenCalledWith(newPreview, null);
  });

  it("releases newly uploaded previews when cancelled without changing the selected cover", async () => {
    await render(null);
    await click(tab("Preview"));
    await uploadFile();
    const cancel = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent === "Cancel")!;
    await click(cancel);
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    await act(async () => root.unmount());
    mounted = false;
    expect(previewService.releaseDraft).toHaveBeenCalledWith(newPreview.id);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps Gallery uploads on the tracked upload workflow", async () => {
    const completed: UploadBatch = {
      id: "gallery-batch", status: "Completed", username: "viewer", canManage: true,
      createdAt: galleryImage.createdAt, completedAt: galleryImage.createdAt,
      totalFiles: 1, successfulFiles: 1, failedFiles: 0, cancelledFiles: 0, items: [],
    };
    vi.mocked(uploadService.submit).mockResolvedValue(completed);
    vi.mocked(uploadService.get).mockResolvedValue(completed);
    await render(null);
    await uploadFile();
    await vi.waitFor(() => expect(uploadService.get).toHaveBeenCalledWith(completed.id));
    expect(uploadService.submit).toHaveBeenCalledOnce();
    expect(previewService.upload).not.toHaveBeenCalled();
    expect(onUploadedPreview).not.toHaveBeenCalled();
  });

  it("reports upload failures without selecting a fake preview", async () => {
    vi.mocked(previewService.upload).mockRejectedValue(new Error("Storage unavailable"));
    await render(null);
    await click(tab("Preview"));
    await uploadFile();
    expect(onUploadedPreview).not.toHaveBeenCalled();
    expect(document.querySelector('[aria-label="new.jpg"]')).toBeNull();
    expect(done().disabled).toBe(false);
    expect(uploadService.submit).not.toHaveBeenCalled();
  });
});
