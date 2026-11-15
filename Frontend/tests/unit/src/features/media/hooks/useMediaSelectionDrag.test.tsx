// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaSelectionDrag } from "../../../../../../src/features/media/hooks/useMediaSelectionDrag";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function SelectionExample() {
  const [selected, setSelected] = useState(false);
  const drag = useMediaSelectionDrag(true, selected, () => selected, (_, next) => setSelected(next));
  return <div {...drag}><button data-media-id="one" aria-pressed={selected} onClick={() => setSelected((value) => !value)}>Media</button></div>;
}

function MultiSelectionExample() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const drag = useMediaSelectionDrag(true, selected.size > 0, (id) => selected.has(id), (id, next) => {
    setSelected((current) => {
      const updated = new Set(current);
      if (next) updated.add(id); else updated.delete(id);
      return updated;
    });
  });
  return <div {...drag}>{["one", "two", "three"].map((id) => (
    <button key={id} data-media-id={id} aria-pressed={selected.has(id)}>{id}</button>
  ))}</div>;
}

function pointer(type: string) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 });
  Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: "touch" }, isPrimary: { value: true } });
  return event;
}

describe("useMediaSelectionDrag", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("extends touch selection across tiles and suppresses the release click", async () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<MultiSelectionExample />));
    const [one, two, three] = container.querySelectorAll("button");
    const originalElementFromPoint = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: vi.fn(() => two) });
    await act(async () => { one.dispatchEvent(pointer("pointerdown")); vi.advanceTimersByTime(500); });
    await act(async () => { one.dispatchEvent(pointer("pointermove")); });
    vi.mocked(document.elementFromPoint).mockReturnValue(three);
    await act(async () => { one.dispatchEvent(pointer("pointermove")); });
    await act(async () => { one.dispatchEvent(pointer("pointerup")); one.click(); });
    expect([one, two, three].map((button) => button.getAttribute("aria-pressed"))).toEqual(["true", "true", "true"]);
    if (originalElementFromPoint) Object.defineProperty(document, "elementFromPoint", originalElementFromPoint);
    else Reflect.deleteProperty(document, "elementFromPoint");
    await act(async () => root.unmount());
    container.remove();
  });

  it("allows scrolling until the hold activates and after the gesture ends", async () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<SelectionExample />));
    const button = container.querySelector("button")!;
    await act(async () => button.dispatchEvent(pointer("pointerdown")));
    const before = new Event("touchmove", { bubbles: true, cancelable: true });
    document.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(false);
    await act(async () => vi.advanceTimersByTime(500));
    const during = new Event("touchmove", { bubbles: true, cancelable: true });
    document.dispatchEvent(during);
    expect(during.defaultPrevented).toBe(true);
    await act(async () => button.dispatchEvent(pointer("pointerup")));
    const after = new Event("touchmove", { bubbles: true, cancelable: true });
    document.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps a touch long-press selected when its delayed click arrives and allows the next tap", async () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<SelectionExample />));
    const button = container.querySelector("button")!;
    await act(async () => { button.dispatchEvent(pointer("pointerdown")); vi.advanceTimersByTime(500); });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    await act(async () => { button.dispatchEvent(pointer("pointerup")); vi.advanceTimersByTime(50); button.click(); });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    await act(async () => { button.dispatchEvent(pointer("pointerdown")); button.dispatchEvent(pointer("pointerup")); button.click(); });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    await act(async () => root.unmount());
    container.remove();
  });
});
