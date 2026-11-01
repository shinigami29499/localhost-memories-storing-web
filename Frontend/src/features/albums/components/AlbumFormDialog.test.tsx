// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlbumFormDialog } from "./AlbumFormDialog";
import { useAnimationStore } from "../../../store/animationStore";

vi.mock("../../media/hooks/usePreviewDrafts", () => ({
  usePreviewDrafts: () => ({ register: vi.fn(), retain: vi.fn() }),
}));

describe("Album form dialog migration", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  const onClose = vi.fn();
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    useAnimationStore.setState({ enabled: true, iconsEnabled: false });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function settle() {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
  }

  async function render() {
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <AlbumFormDialog onSubmit={onSubmit} onClose={onClose} />
      </QueryClientProvider>,
    ));
    await settle();
  }

  async function submit() {
    const input = document.querySelector<HTMLInputElement>(".album-form__field input")!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "My album");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => document.querySelector("form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    ));
  }

  it("removes X and puts the full-width primary action before red Cancel", async () => {
    await render();
    expect(document.querySelector(".confirmation-dialog__close")).toBeNull();
    expect(document.querySelector(".custom-dialog--animated")).not.toBeNull();
    const buttons = Array.from(document.querySelectorAll(".confirmation-dialog__actions button"));
    expect(buttons.map((button) => button.textContent)).toEqual(["Create", "Cancel"]);
    expect(buttons[1].classList.contains("btn--danger")).toBe(true);
    expect(document.activeElement).toBe(document.querySelector(".album-form__field input"));
    act(() => (buttons[1] as HTMLButtonElement).click());
    await settle();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("blocks Cancel, Escape and outside clicks during save", async () => {
    let finish!: () => void;
    onSubmit.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    await render();
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({ name: "My album", isPublic: false, previewMediaId: null });
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
      const viewport = document.querySelector(".confirmation-dialog-viewport")!;
      viewport.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      viewport.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
    });
    await settle();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector(".confirmation-dialog__actions .btn--danger")?.hasAttribute("disabled")).toBe(true);
    await act(async () => finish());
    await settle();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("defers navigation until the exit animation finishes", async () => {
    const navigate = vi.fn();
    onSubmit.mockResolvedValue(navigate);
    let finish!: () => void;
    const animation = document.createElement("div").animate([]);
    Object.defineProperty(animation, "finished", {
      value: new Promise<void>((resolve) => { finish = resolve; }),
    });
    vi.spyOn(Element.prototype, "getAnimations").mockImplementation(function (this: Element) {
      return this.classList.contains("custom-dialog") && this.hasAttribute("data-ending-style") ? [animation] : [];
    });
    await render();
    await submit();
    await settle();
    expect(navigate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => finish());
    await settle();
    expect(onClose).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
  });
});
