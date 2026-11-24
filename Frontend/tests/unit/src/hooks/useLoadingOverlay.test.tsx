// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLoadingOverlay } from "../../../../src/hooks/useLoadingOverlay";

function Feedback({ first, second = false }: { first: boolean; second?: boolean }) {
  return useLoadingOverlay(first || second) ? <div role="status" /> : null;
}

const container = document.createElement("div");
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const render = (first: boolean, second = false) => act(() => root.render(<Feedback first={first} second={second} />));
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const visible = () => Boolean(container.querySelector('[role="status"]'));

it("cancels the pending indicator when work settles before 200 ms", () => {
  render(true);
  tick(199);
  expect(visible()).toBe(false);
  render(false);
  tick(1_000);
  expect(visible()).toBe(false);
});

it("holds for 400 ms when work settles immediately after the overlay appears", () => {
  render(true);
  tick(200);
  expect(visible()).toBe(true);
  tick(1);
  render(false);
  tick(398);
  expect(visible()).toBe(true);
  tick(1);
  expect(visible()).toBe(false);
});

it("stays visible until the last concurrent request settles", () => {
  render(true);
  tick(200);
  render(true, true);
  render(false, true);
  tick(600);
  expect(visible()).toBe(true);
  render(false);
  expect(visible()).toBe(false);
});

it("cancels a scheduled hide when more work begins during the visible interval", () => {
  render(true);
  tick(200);
  render(false);
  tick(100);
  render(true);
  tick(400);
  expect(visible()).toBe(true);
  render(false);
  expect(visible()).toBe(false);
});

it.each([0, 200])("clears timers when unmounted after %i ms", (elapsed) => {
  render(true);
  tick(elapsed);
  render(elapsed === 0);
  act(() => root.render(null));
  expect(vi.getTimerCount()).toBe(0);
});
