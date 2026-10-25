// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewPostForm } from "./NewPostForm";

vi.mock("../services/postService", () => ({
  postService: {
    create: vi.fn(),
  },
}));

describe("NewPostForm drag and drop", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
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
});
