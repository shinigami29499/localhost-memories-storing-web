// @vitest-environment jsdom
import { act, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { MapNavigation } from "../../../../../../src/features/navigation/components/MapNavigation";
import { MapNavigation as MobileMapNavigation } from "../../../../../../apps/mobile/src/places/MobileMapNavigation";

const navigation = vi.hoisted(() => ({ preview: vi.fn(), reset: vi.fn(), stop: vi.fn() }));
vi.mock("react-map-gl/mapbox", () => ({ useMap: () => ({}), Source: () => null, Layer: () => null, Marker: () => null }));
vi.mock("../../../../../../src/features/navigation/hooks/useNavigation", () => ({ useNavigation: () => ({ ...navigation, route: null, position: null,
  tracking: false, loading: false, locating: false, error: null, mapboxPreview: false, gpsUnreliable: false }) }));
vi.mock("../../../../../../src/components/layout/PageActionBar", () => ({ PageActionBar: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("../../../../../../apps/mobile/src/layout/MobilePageActionBar", () => ({ PageActionBar: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("../../../../../../src/components/ui", () => ({
  Button: ({ busy, variant: _variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: string }) =>
    <button {...props} disabled={props.disabled || busy} />,
}));
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

it.each([["web", MapNavigation], ["mobile", MobileMapNavigation]] as const)("%s navigation opens, previews, and resets when closed", async (_, Navigation) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  container.className = "app-shell";
  document.body.append(container);
  const root = createRoot(container);
  const onOpenChange = vi.fn();
  await act(async () => root.render(<Navigation destination={{ latitude: 1, longitude: 2, name: "Place" }} accessToken="pk.test" onOpenChange={onOpenChange} />));
  const open = container.querySelector<HTMLButtonElement>('[aria-label="Navigate"]')!;
  await act(async () => open.click());
  expect(onOpenChange).toHaveBeenLastCalledWith(true);
  const google = container.querySelector<HTMLAnchorElement>('a[href*="google.com/maps"]')!;
  expect(new URL(google.href).searchParams.get("destination")).toBe("1,2");
  await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Preview with Mapbox")!.click());
  expect(navigation.preview).toHaveBeenCalledOnce();
  await act(async () => open.click());
  expect(navigation.reset).toHaveBeenCalledOnce();
  expect(onOpenChange).toHaveBeenLastCalledWith(false);
  expect(document.activeElement).toBe(open);
  await act(async () => root.unmount());
  container.remove();
});
