// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeLocationMarker } from "./HomeLocationMarker";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  clear: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  click: vi.fn(),
  dragEnds: [] as Array<() => void>,
}));

vi.mock("../hooks/useHomeLocation", () => ({
  useHomeLocation: () => ({
    save: { mutateAsync: mocks.save, isPending: false },
    clear: { mutateAsync: mocks.clear, isPending: false },
  }),
}));
vi.mock("../../../components/animate-ui/icons/icon", () => ({
  AnimateIcon: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../../../components/animate-ui/icons/home", () => ({
  Home: () => <svg aria-hidden="true" />,
}));
vi.mock("react-map-gl/mapbox", async () => {
  return {
    Marker: ({ children, latitude, longitude, draggable, onDragStart, onDragEnd }: {
      children: ReactNode;
      latitude: number;
      longitude: number;
      draggable: boolean;
      onDragStart: () => void;
      onDragEnd: (event: { lngLat: { wrap: () => { lat: number; lng: number } } }) => void;
    }) => {
      mocks.dragEnds.push(() => onDragEnd({ lngLat: { wrap: () => ({ lat: -12, lng: 45 }) } }));
      return (
        <div data-marker data-lat={latitude} data-lng={longitude}>
          {children}
          <button data-drag-start disabled={!draggable} onClick={onDragStart}>Start drag</button>
          <button data-drag-end disabled={!draggable}
            onClick={() => onDragEnd({ lngLat: { wrap: () => ({ lat: -12, lng: 45 }) } })}>End drag</button>
        </div>
      );
    },
  };
});
vi.mock("../../../components/ui", () => ({
  showToast: { success: mocks.success, error: mocks.error },
  ConfirmationDialog: ({ title, children, danger, onConfirm, onClose }: {
    title: string;
    children: ReactNode;
    danger: boolean;
    onConfirm: () => Promise<void>;
    onClose: () => void;
  }) => (
    <div role="dialog" data-danger={danger}>
      <h2>{title}</h2>
      {children}
      <button data-confirm onClick={() => void onConfirm().then(onClose, mocks.error)}>Continue</button>
      <button data-cancel onClick={onClose}>Cancel</button>
    </div>
  ),
}));

describe.each(["food", "locations"] as const)("%s home marker", (variant) => {
  let container: HTMLDivElement;
  let root: Root;
  const location = { latitude: 10, longitude: 20 };
  const pin = () => container.querySelector<HTMLButtonElement>('[aria-label="Home location"]')!;
  const click = async (selector: string) => {
    await act(async () => container.querySelector<HTMLButtonElement>(selector)!.click());
  };
  const pointer = async (type: string, x = 0, target: EventTarget = pin()) => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 0 });
    Object.defineProperties(event, {
      pointerId: { value: 1 },
      isPrimary: { value: true },
      pointerType: { value: "touch" },
    });
    await act(async () => { target.dispatchEvent(event); });
  };
  const contextMenu = async (button = 2) => {
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button });
    await act(async () => { pin().dispatchEvent(event); });
    return event;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.save.mockResolvedValue(undefined);
    mocks.clear.mockResolvedValue(undefined);
    mocks.dragEnds = [];
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<HomeLocationMarker location={location} variant={variant} onClick={mocks.click} />);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("preserves normal click", async () => {
    await pointer("pointerdown");
    await pointer("pointerup");
    await act(async () => pin().dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })));
    expect(mocks.click).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("opens removal confirmation at 600 ms without waiting for release", async () => {
    await pointer("pointerdown");
    await act(async () => { vi.advanceTimersByTime(599); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(container.querySelector("h2")?.textContent).toBe("Remove your home location?");
    expect(mocks.clear).not.toHaveBeenCalled();
    await pointer("pointerup");
    expect(container.querySelector("h2")?.textContent).toBe("Remove your home location?");
    await act(async () => pin().dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })));
    expect(mocks.click).not.toHaveBeenCalled();
    await click("[data-confirm]");
    expect(mocks.clear).toHaveBeenCalledOnce();
    expect(mocks.success).toHaveBeenCalledWith("Home location removed.");
  });

  it("right-click opens removal confirmation and cancel never deletes", async () => {
    expect((await contextMenu()).defaultPrevented).toBe(true);
    expect(container.querySelector('[role="dialog"]')?.getAttribute("data-danger")).toBe("true");
    await click("[data-cancel]");
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it.each(["[data-cancel]", "[data-confirm]"])("ends all old gestures after %s", async (choice) => {
    const originalMarker = container.querySelector("[data-marker]");
    const staleDragEnd = mocks.dragEnds.at(-1)!;
    await pointer("pointerdown");
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(container.querySelector("[data-marker]")).not.toBe(originalMarker);
    await act(async () => { staleDragEnd(); });
    expect(container.querySelector("h2")?.textContent).toBe("Remove your home location?");
    await click(choice);
    await act(async () => { staleDragEnd(); });
    await pointer("pointerup");
    await act(async () => {
      pin().dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
      pin().dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(mocks.click).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.clear).toHaveBeenCalledTimes(choice === "[data-confirm]" ? 1 : 0);
    await pointer("pointerdown");
    await pointer("pointerup");
    await act(async () => pin().dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })));
    expect(mocks.click).toHaveBeenCalledOnce();
  });

  it("allows explicit keyboard activation after canceling a long press", async () => {
    await pointer("pointerdown");
    await act(async () => { vi.advanceTimersByTime(600); });
    await click("[data-cancel]");
    await act(async () => {
      pin().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      pin().click();
    });
    expect(mocks.click).toHaveBeenCalledOnce();
  });

  it("cancels the hold when movement starts, even outside the button", async () => {
    await pointer("pointerdown");
    await pointer("pointermove", 12, document);
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it("keeps a drag started before 600 ms separate from a long press", async () => {
    await pointer("pointerdown");
    await act(async () => { vi.advanceTimersByTime(599); });
    expect((await contextMenu(0)).defaultPrevented).toBe(true);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await pointer("pointermove", 12, document);
    await click("[data-drag-start]");
    await act(async () => { vi.advanceTimersByTime(900); });
    await contextMenu(0);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await click("[data-drag-end]");
    await pointer("pointerup", 12, document);
    expect(container.querySelector("h2")?.textContent).toBe("Change your home location?");
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("does not dismiss an opened confirmation on pointer cancellation", async () => {
    await pointer("pointerdown");
    await act(async () => { vi.advanceTimersByTime(900); });
    await pointer("pointercancel", 0, document);
    expect(container.querySelector("h2")?.textContent).toBe("Remove your home location?");
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it.each(["pointerup", "pointercancel"])("cancels the hold on %s", async (type) => {
    await pointer("pointerdown");
    await pointer(type, 0, document);
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("drag requests a move, not removal, and saves only after confirmation", async () => {
    await pointer("pointerdown");
    await click("[data-drag-start]");
    await act(async () => { vi.advanceTimersByTime(700); });
    await click("[data-drag-end]");
    expect(container.querySelector("h2")?.textContent).toBe("Change your home location?");
    expect(container.textContent).toContain("-12.000000, 45.000000");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
    await click("[data-confirm]");
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith({ latitude: -12, longitude: 45 });
    expect(mocks.success).toHaveBeenCalledWith("Home location saved.");
  });

  it("cancel restores the saved position", async () => {
    await click("[data-drag-start]");
    await click("[data-drag-end]");
    expect(container.querySelector("[data-marker]")?.getAttribute("data-lat")).toBe("-12");
    await click("[data-cancel]");
    expect(container.querySelector("[data-marker]")?.getAttribute("data-lat")).toBe("10");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it.each(["Delete", "Backspace"])("supports keyboard removal with %s", async (key) => {
    await act(async () => pin().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
    expect(container.querySelector("h2")?.textContent).toBe("Remove your home location?");
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it("keeps the confirmation open after a failed move and allows retry", async () => {
    const error = new Error("Cannot save home");
    mocks.save.mockRejectedValueOnce(error);
    await click("[data-drag-end]");
    await click("[data-confirm]");
    expect(mocks.error).toHaveBeenCalledWith(error);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(mocks.success).not.toHaveBeenCalled();
    await click("[data-confirm]");
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("cleans up an unfinished hold when unmounted", async () => {
    await pointer("pointerdown");
    await act(async () => root.render(null));
    expect(vi.getTimerCount()).toBe(0);
  });
});
