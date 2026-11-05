// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomDialog as Dialog, useCustomDialog } from "./CustomDialog";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { useAnimationStore } from "../../store/animationStore";

interface TestProps {
  onClose: () => void;
  blocked?: boolean;
  dismissible?: boolean;
  onComplete?: () => void;
  children?: ReactNode;
}

function TestDialog({ onClose, blocked, dismissible, onComplete, children }: TestProps) {
  const { dialogProps, close, dismiss } = useCustomDialog(onClose, { blocked, dismissible });
  return (
    <Dialog.Root {...dialogProps}>
      <Dialog.Portal>
        <Dialog.Backdrop className="confirmation-dialog-backdrop" />
        <Dialog.Viewport className="confirmation-dialog-viewport">
          <Dialog.Popup className="confirmation-dialog">
            <Dialog.Title>Test dialog</Dialog.Title>
            <Dialog.Description>Test message</Dialog.Description>
            <button type="button" onClick={() => close(onComplete)}>Finish</button>
            <button type="button" onClick={dismiss}>Cancel</button>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
      {children}
    </Dialog.Root>
  );
}

describe("Custom dialog migration", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    useAnimationStore.setState({ enabled: true, iconsEnabled: false });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function settle() {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
  }

  async function render(element: ReactNode) {
    await act(async () => root.render(element));
    await settle();
  }

  async function click(label: string) {
    const button = Array.from(document.querySelectorAll("button"))
      .find((element) => element.textContent === label);
    expect(button).toBeDefined();
    await act(async () => button!.click());
  }

  async function outsideClick(viewport = document.querySelector(".confirmation-dialog-viewport")!) {
    act(() => {
      viewport.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      viewport.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
      viewport.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
    });
    await settle();
  }

  async function escape() {
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })));
    await settle();
  }

  it("dismisses on outside click", async () => {
    const onClose = vi.fn();
    await render(<TestDialog onClose={onClose} />);
    await outsideClick();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses on Escape and returns focus", async () => {
    const trigger = document.createElement("button");
    document.body.prepend(trigger);
    trigger.focus();
    try {
      const onClose = vi.fn();
      await render(<TestDialog onClose={onClose} />);
      await escape();
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(trigger);
    } finally {
      trigger.remove();
    }
  });

  it.each([{ blocked: true }, { dismissible: false }])("blocks dismissal for %j", async (options) => {
    const onClose = vi.fn();
    await render(<TestDialog onClose={onClose} {...options} />);
    await outsideClick();
    await escape();
    await click("Cancel");
    await settle();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await click("Finish");
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("waits for exit animation before closing and running completion", async () => {
    const onClose = vi.fn();
    const onComplete = vi.fn();
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => { finish = resolve; });
    const animation = document.createElement("div").animate([]);
    Object.defineProperty(animation, "finished", { value: finished });
    vi.spyOn(Element.prototype, "getAnimations").mockImplementation(function (this: Element) {
      return this.classList.contains("custom-dialog") && this.hasAttribute("data-ending-style") ? [animation] : [];
    });
    await render(<TestDialog onClose={onClose} onComplete={onComplete} />);
    await click("Finish");
    await settle();
    expect(document.querySelector(".custom-dialog[data-ending-style]")).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => finish());
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(onComplete.mock.invocationCallOrder[0]);
    expect(document.querySelector(".custom-dialog")).toBeNull();
  });

  it("omits animation classes when app animations are disabled", async () => {
    useAnimationStore.setState({ enabled: false });
    const onClose = vi.fn();
    await render(<TestDialog onClose={onClose} />);
    expect(document.querySelector(".custom-dialog--animated")).toBeNull();
    expect(document.querySelector(".custom-dialog-backdrop--animated")).toBeNull();
    await click("Cancel");
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses only the nested dialog on outside click", async () => {
    const onClose = vi.fn();
    const onNestedClose = vi.fn();
    await render(<TestDialog onClose={onClose}><TestDialog onClose={onNestedClose} /></TestDialog>);
    const viewports = document.querySelectorAll(".confirmation-dialog-viewport");
    await outsideClick(viewports[viewports.length - 1]);
    expect(onNestedClose).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelectorAll(".custom-dialog")).toHaveLength(1);
    expect(document.querySelector(".custom-dialog[data-nested-dialog-open]")).toBeNull();
  });

  it("orders confirmation actions, focuses Cancel, and blocks dismissal while confirming", async () => {
    const onClose = vi.fn();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    await render(
      <ConfirmationDialog title="Delete album?" confirmLabel="Delete" danger onClose={onClose} onConfirm={() => pending}>
        <p>Saved media stay in your gallery.</p>
      </ConfirmationDialog>,
    );
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(document.querySelector(".confirmation-dialog__close")).toBeNull();
    const actions = Array.from(document.querySelectorAll(".confirmation-dialog__actions button"));
    expect(actions.map((button) => button.textContent)).toEqual(["Cancel", "Delete"]);
    expect(document.activeElement).toBe(actions[0]);
    expect(actions[0].classList.contains("btn--secondary")).toBe(true);
    expect(actions[1].classList.contains("btn--danger")).toBe(true);
    await click("Delete");
    await outsideClick();
    await escape();
    expect(onClose).not.toHaveBeenCalled();
    expect(actions.every((button) => button.hasAttribute("disabled"))).toBe(true);
    await act(async () => finish());
    await settle();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed confirmation open and allows retry", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("Write failed"))
      .mockResolvedValueOnce(undefined);
    await render(
      <ConfirmationDialog title="Continue?" confirmLabel="Continue" onClose={onClose} onConfirm={onConfirm}>
        Test message
      </ConfirmationDialog>,
    );
    await click("Continue");
    await settle();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector(".confirmation-dialog__actions .btn--primary")?.hasAttribute("disabled")).toBe(false);
    await click("Continue");
    await settle();
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
