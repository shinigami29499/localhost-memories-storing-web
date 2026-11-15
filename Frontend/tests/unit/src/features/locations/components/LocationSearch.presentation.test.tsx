// @vitest-environment jsdom
import { act, type InputHTMLAttributes, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { LocationSearch } from "../../../../../../src/features/locations/components/LocationSearch";
import { MobileLocationSearch } from "../../../../../../apps/mobile/src/places/MobileLocationSearch";

const place = { id: "hanoi", latitude: 21, longitude: 105, placeName: "Hanoi" };
vi.mock("../../../../../../src/features/locations/hooks/useLocationSearch", () => ({ useLocationSearch: () => ({ results: [place], searching: false, error: null, retry: vi.fn() }) }));
vi.mock("../../../../../../src/components/ui", () => ({ Input: ({ onChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & { onChange: (value: string) => void }) =>
  <input {...props} onChange={(event) => onChange(event.target.value)} /> }));
vi.mock("../../../../../../src/components/animate-ui/icons/icon", () => ({ AnimateIcon: ({ children }: { children: ReactNode }) => children }));
vi.mock("../../../../../../src/components/animate-ui/icons/search", () => ({ Search: () => <svg /> }));
afterEach(() => vi.unstubAllGlobals());

it.each([["web", LocationSearch], ["mobile", MobileLocationSearch]] as const)("%s search selects a result and closes the list", async (_, Search) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onSelect = vi.fn();
  await act(async () => root.render(<Search onSelect={onSelect} />));
  const input = container.querySelector<HTMLInputElement>('input[name="query"]')!;
  await act(async () => input.focus());
  const result = container.querySelector<HTMLButtonElement>('.place__location-search-results button')!;
  await act(async () => result.click());
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(place);
  expect(input.value).toBe("Hanoi");
  expect(container.querySelector(".place__location-search-results")).toBeNull();
  await act(async () => root.unmount());
  container.remove();
});
