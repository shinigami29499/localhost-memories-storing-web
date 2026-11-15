// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmationDialog } from "../../../../../src/components/ui/ConfirmationDialog";
import { MobileConfirmationDialog } from "../../../../../apps/mobile/src/gallery/MobileConfirmationDialog";
import { useAnimationStore } from "../../../../../src/store/animationStore";

describe.each([["web", ConfirmationDialog], ["mobile", MobileConfirmationDialog]] as const)("%s confirmation", (_name, Dialog) => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it("focuses Cancel, retains failed requests, and blocks duplicate writes and dismissal", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    useAnimationStore.setState({ enabled: false });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error("failed")).mockReturnValueOnce(pending);
    const onClose = vi.fn();
    await act(async () => { root.render(<Dialog title="Delete?" confirmLabel="Delete" danger onConfirm={onConfirm} onClose={onClose}>This cannot be undone.</Dialog>); await new Promise((resolve) => setTimeout(resolve, 60)); });
    const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain("This cannot be undone.");
    const cancel = dialog.querySelector<HTMLButtonElement>(".confirmation-dialog__cancel")!;
    const confirm = dialog.querySelector<HTMLButtonElement>(".confirmation-dialog__confirm")!;
    await vi.waitFor(() => expect(document.activeElement).toBe(cancel));
    await act(async () => confirm.click());
    expect(onClose).not.toHaveBeenCalled();
    expect(confirm.disabled).toBe(false);
    await act(async () => confirm.click());
    expect(confirm.disabled).toBe(true);
    expect(cancel.disabled).toBe(true);
    await act(async () => { confirm.click(); cancel.click(); });
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { finish(); await pending; });
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    await act(async () => root.unmount());
    container.remove();
  });
  it("places nested confirmations in the supplied portal", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    useAnimationStore.setState({ enabled: false });
    const container = document.createElement("div");
    const portal = document.createElement("div");
    document.body.append(container, portal);
    const root = createRoot(container);
    const onClose = vi.fn();
    await act(async () => root.render(<Dialog title="Remove?" confirmLabel="Remove" portalContainer={portal} onConfirm={async () => {}} onClose={onClose}>Remove this item.</Dialog>));
    await vi.waitFor(() => expect(portal.querySelector('[role="alertdialog"]')).not.toBeNull());
    expect(portal.querySelector('[role="alertdialog"]')?.textContent).toContain("Remove this item.");
    await act(async () => root.unmount());
    container.remove();
    portal.remove();
  });

});
