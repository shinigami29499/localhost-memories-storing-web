// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlbumCaption } from "../../../../../src/pages/albums/AlbumCaption";
import { MobileAlbumCaption } from "../../../../../apps/mobile/src/gallery/MobileAlbumCaption";

vi.mock("../../../../../src/features/albums/hooks/useCaptionPreview", () => ({
  useCaptionPreview: () => ({ textRef: { current: null }, preview: "Short caption", overflow: true }),
}));

describe.each([["web", AlbumCaption], ["mobile", MobileAlbumCaption]] as const)("%s album caption", (_name, Caption) => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it("opens its full caption and returns focus on close", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<Caption caption="Full album caption" />));
    const trigger = container.querySelector<HTMLButtonElement>(".album-hero__caption-button")!;
    await act(async () => { trigger.focus(); trigger.click(); await new Promise((resolve) => setTimeout(resolve, 40)); });
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Full album caption");
    const close = document.querySelector<HTMLButtonElement>(".album-caption-view__header button")!;
    await act(async () => { close.click(); await new Promise((resolve) => setTimeout(resolve, 80)); });
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    await act(async () => root.unmount());
    container.remove();
  });
});
