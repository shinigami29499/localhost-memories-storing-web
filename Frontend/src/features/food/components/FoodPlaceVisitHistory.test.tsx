// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../../auth/types";
import { useAuthStore } from "../../../store/authStore";
import { useCheckInFoodPlace, useFoodPlaceVisitHistory } from "../hooks/useFoodPlaces";
import type { FoodPlaceVisit } from "../types";
import { FoodPlaceVisitHistory } from "./FoodPlaceVisitHistory";
import { FoodVisitHistory } from "./FoodVisitHistory";

const service = vi.hoisted(() => ({
  visitHistory: vi.fn(),
  checkIn: vi.fn(),
  removeVisit: vi.fn(),
}));

vi.mock("../services/foodPlaceService", () => ({ foodPlaceService: service }));
vi.mock("../../../components/ui", () => ({
  Spinner: () => <div role="status">Loading…</div>,
  ErrorState: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div role="alert">
      {message}
      <button type="button" onClick={onRetry}>Try again</button>
    </div>
  ),
  showToast: { success: vi.fn(), error: vi.fn() },
}));

const userA: AuthUser = {
  id: "user-a",
  username: "A",
  role: "user",
  status: "active",
  createdAt: "2026-01-01T00:00:00Z",
};
const userB: AuthUser = { ...userA, id: "user-b", username: "B" };

function visit(id: string, foodPlaceId: string, visitedAt: string): FoodPlaceVisit {
  return {
    id,
    foodPlaceId,
    foodPlaceName: foodPlaceId === "place-a" ? "Cafe" : "Bistro",
    foodPlaceAddress: "1 Main Street",
    markerIcon: "☕",
    visitedAt,
  };
}

function HistoryHarness({ foodPlaceId }: { foodPlaceId: string }) {
  const globalHistory = useFoodPlaceVisitHistory();
  const checkIn = useCheckInFoodPlace();
  return (
    <>
      <FoodPlaceVisitHistory foodPlaceId={foodPlaceId} />
      <div data-global-history>
        <FoodVisitHistory visits={globalHistory.data ?? []} />
      </div>
      <button type="button" data-check-in onClick={() => checkIn.mutate(foodPlaceId)}>
        Check in
      </button>
    </>
  );
}

describe("food place visit history", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let visits: Record<string, FoodPlaceVisit[]>;

  const settle = async () => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  };
  const mount = async (foodPlaceId = "place-a") => {
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <HistoryHarness foodPlaceId={foodPlaceId} />
      </QueryClientProvider>,
    ));
    await settle();
  };
  const placeHistory = () => container.querySelector<HTMLElement>(".food__place-history")!;
  const dates = (element: Element) =>
    Array.from(element.querySelectorAll("time"), (time) => time.getAttribute("datetime"));

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.resetAllMocks();
    useAuthStore.setState({ user: userA });
    visits = {
      "user-a": [
        visit("a-1", "place-a", "2026-10-31T12:00:00Z"),
        visit("b-1", "place-b", "2026-10-30T12:00:00Z"),
        visit("a-2", "place-a", "2026-10-29T12:00:00Z"),
      ],
      "user-b": [visit("a-3", "place-a", "2026-10-28T12:00:00Z")],
    };
    service.visitHistory.mockImplementation(async () => {
      const userId = useAuthStore.getState().user?.id;
      if (!userId || !visits[userId]) throw new Error("Missing test user.");
      return [...visits[userId]];
    });
    service.checkIn.mockImplementation(async (foodPlaceId: string) => {
      visits["user-a"].unshift(visit("new", foodPlaceId, "2026-11-01T12:00:00Z"));
    });
    service.removeVisit.mockImplementation(async (visitId: string) => {
      visits["user-a"] = visits["user-a"].filter((item) => item.id !== visitId);
    });
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    onlineManager.setOnline(true);
    container.remove();
    useAuthStore.getState().clear();
    vi.unstubAllGlobals();
  });

  it("shows only the selected place's visits in the existing order", async () => {
    await mount();
    expect(dates(placeHistory())).toEqual([
      "2026-10-31T12:00:00Z",
      "2026-10-29T12:00:00Z",
    ]);
    expect(placeHistory().textContent).not.toContain("Cafe");
    expect(container.querySelector("[data-global-history]")?.textContent).toContain("Bistro");
  });

  it("shows an empty state when this place has no visits", async () => {
    await mount("place-c");
    expect(placeHistory().textContent).toContain("No visits at this place yet.");
    expect(dates(placeHistory())).toEqual([]);
  });

  it("does not show an empty history while the request is paused offline", async () => {
    onlineManager.setOnline(false);
    await mount();
    expect(placeHistory().querySelector('[role="status"]')).not.toBeNull();
    expect(placeHistory().textContent).not.toContain("No visits at this place yet.");
  });

  it("shows a retryable error instead of an empty history", async () => {
    service.visitHistory.mockRejectedValueOnce(new Error("Unavailable"));
    await mount();
    expect(placeHistory().textContent).toContain("Could not load visit history.");
    expect(placeHistory().textContent).not.toContain("No visits at this place yet.");
    await act(async () => placeHistory().querySelector("button")!.click());
    await settle();
    expect(dates(placeHistory())).toHaveLength(2);
  });

  it("refreshes both place and global history after checking in", async () => {
    await mount();
    await act(async () => container.querySelector<HTMLButtonElement>("[data-check-in]")!.click());
    await settle();
    expect(dates(placeHistory())[0]).toBe("2026-11-01T12:00:00Z");
    expect(dates(container.querySelector("[data-global-history]")!)).toHaveLength(4);
  });

  it("removes a visit and refreshes history", async () => {
    await mount();
    const removeBtn = placeHistory().querySelector<HTMLButtonElement>(".food__history-remove");
    expect(removeBtn).not.toBeNull();
    await act(async () => removeBtn!.click());
    await settle();
    expect(service.removeVisit).toHaveBeenCalledWith("a-1");
    expect(dates(placeHistory())).toEqual(["2026-10-29T12:00:00Z"]);
    expect(dates(container.querySelector("[data-global-history]")!)).toEqual([
      "2026-10-30T12:00:00Z",
      "2026-10-29T12:00:00Z",
    ]);
  });

  it("does not display another user's cached visits while a new account loads", async () => {
    await mount();
    let resolveHistory: (value: FoodPlaceVisit[]) => void = () => {
      throw new Error("History request was not started.");
    };
    service.visitHistory.mockReturnValueOnce(new Promise<FoodPlaceVisit[]>((resolve) => {
      resolveHistory = resolve;
    }));
    await act(async () => useAuthStore.setState({ user: userB }));
    expect(placeHistory().querySelector('[role="status"]')).not.toBeNull();
    expect(dates(placeHistory())).toEqual([]);
    await act(async () => resolveHistory(visits["user-b"]));
    await settle();
    expect(dates(placeHistory())).toEqual(["2026-10-28T12:00:00Z"]);
  });

  it("discards a pending response if the signed-in user changes", async () => {
    let resolveHistory: (value: FoodPlaceVisit[]) => void = () => {
      throw new Error("History request was not started.");
    };
    service.visitHistory.mockReturnValueOnce(new Promise<FoodPlaceVisit[]>((resolve) => {
      resolveHistory = resolve;
    }));
    await mount();
    await act(async () => useAuthStore.setState({ user: userB }));
    await settle();
    await act(async () => resolveHistory(visits["user-b"]));
    await settle();
    await act(async () => useAuthStore.setState({ user: userA }));
    await settle();
    expect(dates(placeHistory())).toEqual([
      "2026-10-31T12:00:00Z",
      "2026-10-29T12:00:00Z",
    ]);
  });
});
