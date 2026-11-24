// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { useThrottledCallback } from "../../../../src/hooks/useThrottledCallback";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("runs a trailing call with the latest value and callback, and cancels on unmount", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const calls = vi.fn();
  const container = document.createElement("div");
  const root = createRoot(container);
  let scroll: (value: number) => void = () => {};

  function Example({ label }: { label: string }) {
    scroll = useThrottledCallback((value: number) => calls(label, value), 100);
    return null;
  }

  await act(async () => root.render(<Example label="first" />));
  await act(async () => {
    scroll(1);
    scroll(2);
    vi.advanceTimersByTime(50);
    scroll(3);
    root.render(<Example label="latest" />);
  });
  expect(calls.mock.calls).toEqual([["first", 1]]);
  await act(async () => vi.advanceTimersByTime(50));
  expect(calls.mock.calls).toEqual([["first", 1], ["latest", 3]]);
  await act(async () => {
    scroll(4);
    root.unmount();
    vi.advanceTimersByTime(100);
  });
  expect(calls).toHaveBeenCalledTimes(2);
});
