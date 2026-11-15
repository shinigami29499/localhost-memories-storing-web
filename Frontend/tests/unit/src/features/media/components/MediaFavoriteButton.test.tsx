// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaFavoriteButton } from "../../../../../../src/features/media/components/MediaFavoriteButton";
import { MobileMediaFavoriteButton } from "../../../../../../apps/mobile/src/gallery/MobileMediaFavoriteButton";

describe.each([["web", MediaFavoriteButton], ["mobile", MobileMediaFavoriteButton]] as const)("%s media favorite", (_name, Favorite) => {
  afterEach(() => vi.unstubAllGlobals());
  it("toggles only when idle and exposes its current state", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("SVGGeometryElement", class extends SVGElement {});
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const container = document.createElement("div");
    const root = createRoot(container);
    const onToggle = vi.fn();
    await act(async () => root.render(<Favorite isFavorited={false} busy={false} onToggle={onToggle} />));
    const button = container.querySelector<HTMLButtonElement>("button")!;
    expect(button.getAttribute("aria-label")).toBe("Add to favorites");
    await act(async () => button.click());
    expect(onToggle).toHaveBeenCalledOnce();
    await act(async () => root.render(<Favorite isFavorited={true} busy onToggle={onToggle} />));
    expect(button.getAttribute("aria-label")).toBe("Remove from favorites");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.disabled).toBe(true);
    await act(async () => button.click());
    expect(onToggle).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
  });
});
