// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { showToast, toastManager, ToastProvider } from "./Toast";

function pointerEvent(type: string, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: "mouse" },
  });
  return event;
}

describe("ToastProvider", () => {
  let container: HTMLDivElement;
  let root: Root;
  let addedElements: HTMLElement[];

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("SVGGeometryElement", class extends SVGElement {});
    addedElements = [];
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    addedElements.forEach((element) => element.remove());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the app when no toast is active", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      root.render(
        <ToastProvider>
          <main>Application content</main>
        </ToastProvider>,
      );
    });

    expect(container.textContent).toContain("Application content");
    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each([
    ["title", ".toast-title"],
    ["description", ".toast-description"],
    ["icon", ".toast-icon-wrapper"],
    ["content", ".toast-content"],
    ["background", ".toast-root"],
  ])("dismisses only the clicked toast through its %s", async (_part, selector) => {
    const firstClosed = vi.fn();
    const secondClosed = vi.fn();
    const close = vi.spyOn(toastManager, "close");
    let firstId = "";
    await act(async () => {
      root.render(<ToastProvider><main>Application content</main></ToastProvider>);
    });
    await act(async () => {
      firstId = toastManager.add({ title: "First", description: "Details", timeout: 30000, onClose: firstClosed });
      toastManager.add({ title: "Second", timeout: 30000, onClose: secondClosed });
    });

    const toast = Array.from(document.querySelectorAll<HTMLElement>(".toast-root"))
      .find((item) => item.querySelector(".toast-title")?.textContent === "First");
    const target = selector === ".toast-root" ? toast : toast?.querySelector<HTMLElement>(selector);
    expect(target).toBeTruthy();
    await act(async () => {
      target?.click();
    });

    expect(close).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledWith(firstId);
    expect(firstClosed).toHaveBeenCalledOnce();
    expect(secondClosed).not.toHaveBeenCalled();
  });

  it("keeps an undo toast open until its action finishes", async () => {
    let resolveUndo: (() => void) | undefined;
    const undo = vi.fn(() => new Promise<void>((resolve) => { resolveUndo = resolve; }));
    const close = vi.spyOn(toastManager, "close");
    let toastId = "";
    await act(async () => {
      root.render(<ToastProvider><main>Application content</main></ToastProvider>);
    });
    await act(async () => {
      toastId = showToast.success("Saved", { undo, timeout: 30000 });
    });

    const action = document.querySelector<HTMLButtonElement>(".toast-action");
    expect(action).not.toBeNull();
    await act(async () => {
      action?.click();
    });
    expect(undo).toHaveBeenCalledOnce();
    expect(action?.disabled).toBe(true);
    expect(close).not.toHaveBeenCalled();

    await act(async () => {
      resolveUndo?.();
    });
    expect(close).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledWith(toastId);
  });

  it("keeps the existing close button behavior", async () => {
    const onClose = vi.fn();
    const close = vi.spyOn(toastManager, "close");
    await act(async () => {
      root.render(<ToastProvider><main>Application content</main></ToastProvider>);
    });
    await act(async () => {
      toastManager.add({ title: "Saved", timeout: 30000, onClose });
    });

    const button = document.querySelector<HTMLButtonElement>(".toast-close");
    expect(button).not.toBeNull();
    await act(async () => {
      button?.click();
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
  });

  it("does not dismiss cancelled swipes or button presses released outside the button", async () => {
    vi.stubGlobal("DOMMatrix", class {
      m41 = 0;
      m42 = 0;
      a = 1;
      b = 0;
    });
    const onClose = vi.fn();
    const undo = vi.fn();
    await act(async () => {
      root.render(<ToastProvider><main>Application content</main></ToastProvider>);
    });
    await act(async () => {
      toastManager.add({ title: "Saved", timeout: 30000, data: { undo }, onClose });
    });

    const toast = document.querySelector<HTMLElement>(".toast-root");
    const action = toast?.querySelector<HTMLButtonElement>(".toast-action");
    expect(toast).not.toBeNull();
    expect(action).not.toBeNull();
    await act(async () => {
      toast?.dispatchEvent(pointerEvent("pointerdown", 10, 10));
      toast?.dispatchEvent(pointerEvent("pointermove", 30, 10));
      toast?.dispatchEvent(pointerEvent("pointermove", 10, 10));
      toast?.dispatchEvent(pointerEvent("pointerup", 10, 10));
      toast?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1, clientX: 10, clientY: 10 }));
    });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      action?.dispatchEvent(pointerEvent("pointerdown", 10, 10));
      toast?.dispatchEvent(pointerEvent("pointerup", 10, 10));
      toast?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1, clientX: 10, clientY: 10 }));
    });
    expect(undo).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      toast?.dispatchEvent(pointerEvent("pointerdown", 10, 10));
      toast?.dispatchEvent(pointerEvent("pointermove", 19, 10));
      toast?.dispatchEvent(pointerEvent("pointerup", 19, 10));
      toast?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1, clientX: 19, clientY: 10 }));
    });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      toast?.dispatchEvent(pointerEvent("pointerdown", 10, 10));
      toast?.dispatchEvent(pointerEvent("pointermove", 18, 10));
      toast?.dispatchEvent(pointerEvent("pointerup", 18, 10));
      toast?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1, clientX: 18, clientY: 10 }));
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps focused toasts above portals added later", async () => {
    await act(async () => {
      root.render(<ToastProvider><main>Application content</main></ToastProvider>);
    });
    await act(async () => {
      showToast.success("Saved", { timeout: 30000 });
    });

    const layer = document.querySelector<HTMLElement>(".toast-layer");
    const close = layer?.querySelector<HTMLButtonElement>(".toast-close");
    expect(layer).not.toBeNull();
    expect(close).not.toBeNull();
    await act(async () => {
      close?.focus();
    });
    expect(document.activeElement).toBe(close);

    const overlay = document.createElement("div");
    addedElements.push(overlay);
    await act(async () => {
      document.body.append(overlay);
    });

    expect(document.body.lastElementChild).toBe(layer);
    expect(document.activeElement).toBe(close);
  });

  it("moves active toasts between modal dialogs without remounting them", async () => {
    vi.stubGlobal("CSS", { supports: () => false });
    await act(async () => {
      root.render(<ToastProvider><main>Application content</main></ToastProvider>);
    });
    await act(async () => {
      showToast.info("Still visible", { timeout: 30000 });
    });

    const layer = document.querySelector<HTMLElement>(".toast-layer");
    const toast = layer?.querySelector(".toast-root");
    expect(layer).not.toBeNull();
    expect(toast).not.toBeNull();
    expect(layer?.parentElement).toBe(document.body);

    const first = document.createElement("dialog");
    const second = document.createElement("dialog");
    addedElements.push(first, second);

    await act(async () => {
      document.body.append(first);
      first.open = true;
    });
    expect(layer?.parentElement).toBe(first);
    expect(layer?.querySelector(".toast-root")).toBe(toast);

    await act(async () => {
      first.append(document.createElement("div"));
    });
    expect(first.lastElementChild).toBe(layer);

    await act(async () => {
      document.body.prepend(second);
      second.open = true;
    });
    expect(layer?.parentElement).toBe(second);

    await act(async () => {
      second.open = false;
    });
    expect(layer?.parentElement).toBe(first);

    await act(async () => {
      first.remove();
    });
    expect(layer?.parentElement).toBe(document.body);
    expect(layer?.querySelector(".toast-root")).toBe(toast);
  });

  it("keeps toast actions usable while a modal is open", async () => {
    vi.stubGlobal("CSS", { supports: () => false });
    const undo = vi.fn();
    await act(async () => {
      root.render(<ToastProvider><main>Application content</main></ToastProvider>);
    });
    await act(async () => {
      showToast.success("Saved", { undo });
    });

    const dialog = document.createElement("dialog");
    addedElements.push(dialog);
    await act(async () => {
      document.body.append(dialog);
      dialog.open = true;
    });

    const action = dialog.querySelector<HTMLButtonElement>(".toast-action");
    expect(action).not.toBeNull();
    await act(async () => {
      action?.click();
    });
    expect(undo).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);
  });
});
