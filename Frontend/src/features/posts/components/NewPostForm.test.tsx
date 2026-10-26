// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewPostForm } from "./NewPostForm";
import { postService } from "../services/postService";

vi.mock("../services/postService", () => ({
  postService: {
    create: vi.fn(),
  },
}));

vi.mock("@/components/animate-ui/icons/paperclip", async () => {
  const { useAnimateIconContext } = await import("@animate-ui/react/icons");
  return { Paperclip: () => <svg data-paperclip data-animated={String(useAnimateIconContext().active === true)} /> };
});

describe("NewPostForm", () => {
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

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("animates the paperclip when hovering anywhere on the attachment label", async () => {
    await act(async () => root.render(<NewPostForm onCreated={vi.fn()} />));
    const label = container.querySelector<HTMLLabelElement>(".new-post__pick")!;
    expect(label.querySelector("[data-paperclip]")?.getAttribute("data-animated")).toBe("false");
    await act(async () => label.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })));
    expect(label.querySelector("[data-paperclip]")?.getAttribute("data-animated")).toBe("true");
    await act(async () => label.dispatchEvent(new MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body })));
    expect(label.querySelector("[data-paperclip]")?.getAttribute("data-animated")).toBe("false");
  });

  it("handles drag over, drag enter, drag leave, and drop events to attach files", async () => {
    const onCreated = vi.fn();
    await act(async () => {
      root.render(<NewPostForm onCreated={onCreated} />);
    });

    const section = container.querySelector("section.new-post") as HTMLElement;
    expect(section).toBeTruthy();
    expect(section.classList.contains("new-post--dragging")).toBe(false);

    // Drag enter toggles dragging class
    await act(async () => {
      const enterEvent = new Event("dragenter", { bubbles: true, cancelable: true });
      section.dispatchEvent(enterEvent);
    });
    expect(section.classList.contains("new-post--dragging")).toBe(true);

    // Drag over prevents default
    await act(async () => {
      const overEvent = new Event("dragover", { bubbles: true, cancelable: true });
      section.dispatchEvent(overEvent);
    });

    // Drag leave outside section resets dragging state
    await act(async () => {
      const leaveEvent = new MouseEvent("dragleave", { bubbles: true, cancelable: true });
      Object.defineProperty(leaveEvent, "relatedTarget", { value: document.body });
      section.dispatchEvent(leaveEvent);
    });
    expect(section.classList.contains("new-post--dragging")).toBe(false);

    // Drop file attaches it to the post
    const sampleFile = new File(["sample content"], "photo.png", { type: "image/png" });
    await act(async () => {
      const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          files: [sampleFile],
        },
      });
      section.dispatchEvent(dropEvent);
    });

    const chips = container.querySelectorAll(".new-post__chip");
    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toContain("photo.png");
  });

  it("creates a post with media and no caption", async () => {
    await act(async () => root.render(<NewPostForm onCreated={vi.fn()} />));

    const sampleFile = new File(["sample content"], "photo.png", { type: "image/png" });
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(fileInput, "files", { configurable: true, value: [sampleFile] });
    await act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const postButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Post"))!;
    expect(postButton.disabled).toBe(false);
    await act(async () => {
      postButton.click();
    });

    expect(postService.create).toHaveBeenCalledWith(undefined, [sampleFile]);
  });
});
