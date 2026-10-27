// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReactionControls } from "./ReactionControls";

describe("ReactionControls", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })));
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("toggles the single heart reaction", async () => {
    const onToggle = vi.fn(async () => {});

    await act(async () => {
      root.render(
        <ReactionControls
          counts={[
            { reactionType: "heart", count: 2 },
            { reactionType: "like", count: 3 },
            { reactionType: "laugh", count: 1 },
          ]}
          mine={["heart"]}
          onToggle={onToggle}
        />,
      );
    });

    const button = container.querySelector<HTMLButtonElement>(".reactions__chip");

    expect(button?.getAttribute("aria-pressed")).toBe("true");
    expect(button?.getAttribute("aria-label")).toBe("Remove heart reaction. 2 hearts");
    expect(container.querySelector(".reactions__count")?.textContent).toBe("2");
    expect(container.querySelector(".reactions__picker")).toBeNull();
    expect(container.querySelector(".reaction-icon--heart")?.getAttribute("fill")).toBe("var(--danger)");
    expect(container.querySelector(".reaction-icon--heart")?.getAttribute("stroke")).toBe("var(--danger)");

    await act(async () => {
      button?.click();
    });

    expect(onToggle).toHaveBeenCalledWith("heart");
  });

  it("disables the heart button while a toggle is pending", async () => {
    await act(async () => {
      root.render(
        <ReactionControls
          counts={[{ reactionType: "heart", count: 1 }]}
          mine={["heart"]}
          onToggle={vi.fn(async () => {})}
          busy
        />,
      );
    });

    const buttons = container.querySelectorAll<HTMLButtonElement>("button");

    expect(buttons).toHaveLength(1);
    expect(buttons[0].disabled).toBe(true);
    expect(container.querySelector(".reactions__chip")?.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelectorAll(".reaction-icon--heart")).toHaveLength(1);
  });
});
