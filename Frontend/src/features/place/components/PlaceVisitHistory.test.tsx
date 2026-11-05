// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../../auth/types";
import { useAuthStore } from "../../../store/authStore";
import { useCheckInPlace, usePlaceVisitHistory } from "../hooks/usePlaces";
import type { PlaceVisit } from "../types";
import { SinglePlaceVisitHistory } from "./SinglePlaceVisitHistory";
import { PlaceVisitHistory } from "./PlaceVisitHistory";

const service = vi.hoisted(() => ({
  allVisitHistory: vi.fn(),
  visitPage: vi.fn(),
  checkIn: vi.fn(),
  removeVisit: vi.fn(),
}));

vi.mock("../services/placeService", () => ({ placeService: service }));
vi.mock("../../../components/ui", () => ({
  Spinner: () => <div role="status">Loading…</div>,
  ErrorState: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div role="alert">
      {message}
      <button type="button" onClick={onRetry}>Try again</button>
    </div>
  ),
  showToast: { success: vi.fn(), error: vi.fn(), delete: vi.fn() },
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

const userA: AuthUser = {
  id: "user-a",
  username: "A",
  role: "user",
  status: "active",
  createdAt: "2026-01-01T00:00:00Z",
};
const userB: AuthUser = { ...userA, id: "user-b", username: "B" };

function visit(id: string, placeId: string, visitedAt: string): PlaceVisit {
  return {
    id,
    placeId,
    placeName: placeId === "place-a" ? "Cafe" : "Bistro",
    placeAddress: "1 Main Street",
    markerIcon: "☕",
    markerColor: "#f97316",
    visitedAt,
    userId: "user-a",
    username: "A",
    avatarSeed: null,
    note: "",
    rating: 0,
  };
}

function HistoryHarness({ placeId }: { placeId: string }) {
  const globalHistory = usePlaceVisitHistory();
  const checkIn = useCheckInPlace();
  return (
    <>
      <SinglePlaceVisitHistory placeId={placeId} />
      <div data-global-history>
        <PlaceVisitHistory visits={globalHistory.data ?? []} />
      </div>
      <button type="button" data-check-in onClick={() => checkIn.mutate(placeId)}>
        Check in
      </button>
    </>
  );
}

describe("place visit history", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let visits: Record<string, PlaceVisit[]>;

  const settle = async () => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  };
  const mount = async (placeId = "place-a") => {
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <HistoryHarness placeId={placeId} />
      </QueryClientProvider>,
    ));
    await settle();
  };
  const placeHistory = () => container.querySelector<HTMLElement>(".place__place-history")!;
  const dates = (element: Element) =>
    Array.from(element.querySelectorAll("time"), (time) => time.getAttribute("datetime"));

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.resetAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-31T12:02:00Z"));
    useAuthStore.setState({ user: userA });
    visits = {
      "user-a": [
        visit("a-1", "place-a", "2026-10-31T12:00:00Z"),
        visit("b-1", "place-b", "2026-10-30T12:00:00Z"),
        visit("a-2", "place-a", "2026-10-29T12:00:00Z"),
      ],
      "user-b": [visit("a-3", "place-a", "2026-10-28T12:00:00Z")],
    };
    service.allVisitHistory.mockImplementation(async () => {
      const userId = useAuthStore.getState().user?.id;
      if (!userId || !visits[userId]) throw new Error("Missing test user.");
      return [...visits[userId]];
    });
    service.visitPage.mockImplementation(async (page: number, limit: number, _all: boolean, placeId: string) => {
      const userId = useAuthStore.getState().user?.id;
      if (!userId || !visits[userId]) throw new Error("Missing test user.");
      const matching = visits[userId].filter((item) => item.placeId === placeId);
      return { items: matching.slice((page - 1) * limit, page * limit), page, limit, total: matching.length };
    });
    service.checkIn.mockImplementation(async (placeId: string) => {
      visits["user-a"].unshift(visit("new", placeId, "2026-11-01T12:00:00Z"));
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
    vi.restoreAllMocks();
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

  it("keeps a later page selected while that page loads", async () => {
    visits["user-a"] = Array.from({ length: 7 }, (_, index) =>
      visit(`page-${index}`, "place-a", `2026-10-${String(31 - index).padStart(2, "0")}T12:00:00Z`));
    await mount();
    expect(dates(placeHistory())).toHaveLength(5);
    await act(async () => placeHistory().querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click());
    await settle();
    expect(dates(placeHistory())).toEqual(["2026-10-26T12:00:00Z", "2026-10-25T12:00:00Z"]);
    expect(service.visitPage).toHaveBeenCalledWith(2, 5, true, "place-a", expect.any(AbortSignal));
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
    service.visitPage.mockRejectedValueOnce(new Error("Unavailable"));
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
    const removeBtn = placeHistory().querySelector<HTMLButtonElement>(".place__history-remove");
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
    let resolveHistory: (value: PlaceVisit[]) => void = () => {
      throw new Error("History request was not started.");
    };
    service.visitPage.mockReturnValueOnce(new Promise((resolve) => {
      resolveHistory = (items) => resolve({ items, page: 1, limit: 5, total: items.length });
    }));
    await act(async () => useAuthStore.setState({ user: userB }));
    expect(placeHistory().querySelector('[role="status"]')).not.toBeNull();
    expect(dates(placeHistory())).toEqual([]);
    await act(async () => resolveHistory(visits["user-b"]));
    await settle();
    expect(dates(placeHistory())).toEqual(["2026-10-28T12:00:00Z"]);
  });

  it("discards a pending response if the signed-in user changes", async () => {
    let resolveHistory: (value: PlaceVisit[]) => void = () => {
      throw new Error("History request was not started.");
    };
    service.visitPage.mockReturnValueOnce(new Promise((resolve) => {
      resolveHistory = (items) => resolve({ items, page: 1, limit: 5, total: items.length });
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
