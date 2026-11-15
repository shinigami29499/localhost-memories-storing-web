// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { MobilePlacePage } from "../../../../../apps/mobile/src/places/MobilePlacePage";

const controls = vi.hoisted(() => ({ select: vi.fn(), changeView: vi.fn(), nextPage: vi.fn() }));
vi.mock("../../../../../src/pages/place/usePlacePageController", () => ({
  emptyValues: {},
  usePlacePageController: () => ({
    t: (value: string) => value, isMobile: true, view: "saved", saved: true,
    requestView: controls.changeView, selectPlace: controls.select,
    activeRating: 0, placeSearch: "", historySearch: "", query: {},
    savedPlaces: { hasNextPage: true, fetchNextPage: controls.nextPage },
    places: [{ id: "one", name: "Place", address: "Address", markerColor: "red", markerIcon: "X", owner: { username: "Owner" }, rating: 3 }],
    filteredPlaces: [{ id: "one", name: "Place", address: "Address", markerColor: "red", markerIcon: "X", owner: { username: "Owner" }, rating: 3 }],
  }),
}));
vi.mock("../../../../../src/hooks/PushTransition", () => ({ PushTransition: () => null }));
vi.mock("../../../../../src/components/ui/PageHighlightBar", () => ({ PageHighlightBar: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("../../../../../apps/mobile/src/layout/MobilePageActionBar", () => ({ PageActionBar: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("../../../../../src/components/animate-ui/icons/icon", () => ({ AnimateIcon: ({ children }: { children: ReactNode }) => children }));
vi.mock("../../../../../src/components/animate-ui/icons/star", () => ({ Star: () => <svg /> }));
vi.mock("../../../../../src/components/animate-ui/icons/search", () => ({ Search: () => <svg /> }));
vi.mock("../../../../../src/features/place/components/StarRating", () => ({ StarRating: () => <span>Rating</span> }));

afterEach(() => vi.unstubAllGlobals());

it("renders mobile saved places, navigation, and pagination", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.values(controls).forEach((mock) => mock.mockReset());
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<MobilePlacePage />));
  const buttons = [...container.querySelectorAll("button")];
  await act(async () => {
    buttons.find((button) => button.textContent === "History")!.click();
    buttons.find((button) => button.textContent?.includes("PlaceAddress"))!.click();
    buttons.find((button) => button.textContent === "Load more places")!.click();
  });
  expect(controls.changeView).toHaveBeenCalledWith("history");
  expect(controls.select).toHaveBeenCalledWith(expect.objectContaining({ id: "one" }));
  expect(controls.nextPage).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
  container.remove();
});
