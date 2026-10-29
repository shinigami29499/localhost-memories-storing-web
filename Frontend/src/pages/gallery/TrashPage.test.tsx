// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimateUIProvider } from "@animate-ui/react/provider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../context/LocaleContext";
import { mediaService } from "../../features/media/services/mediaService";
import type { MediaFile } from "../../features/media/types";
import { TrashPage } from "./TrashPage";

vi.mock("../../features/media/services/mediaService", () => ({
  mediaService: {
    deleted: vi.fn(),
    restore: vi.fn(),
  },
}));
vi.mock("../../components/ui/ConfirmationDialog", () => ({
  ConfirmationDialog: ({ onConfirm, onClose }: { onConfirm: () => Promise<void>; onClose: () => void }) => (
    <div role="dialog">
      <button type="button" onClick={() => void onConfirm().then(onClose)}>Confirm restore</button>
    </div>
  ),
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

describe("TrashPage", () => {
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
    vi.mocked(mediaService.deleted).mockResolvedValue({
      offset: 0,
      limit: 10,
      total: 1,
      items: [trashedMedia],
    });
    vi.mocked(mediaService.restore).mockResolvedValue(undefined);
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
  });

  it("lists deleted media and restores a selected item", async () => {
    await act(async () => root.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <LocaleProvider>
            <AnimateUIProvider reducedMotion="always"><TrashPage /></AnimateUIProvider>
          </LocaleProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    ));

    await vi.waitFor(() => expect(container.textContent).toContain("deleted.png"));
    expect(mediaService.deleted).toHaveBeenCalledWith(0, 10, undefined);
    await act(async () => {
      Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Restore"))?.click();
    });
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>('[role="dialog"] button')!.click());
    await vi.waitFor(() => expect(mediaService.restore).toHaveBeenCalledWith("trashed-id"));
  });
});
