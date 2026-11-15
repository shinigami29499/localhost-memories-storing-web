// @vitest-environment jsdom
import { act, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { MobilePlaceVisitHistory } from "../../../../../../apps/mobile/src/places/MobilePlaceVisitHistory";
import type { PlaceVisit } from "../../../../../../src/features/place/types";
import { useAuthStore } from "../../../../../../src/store/authStore";

const notify = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("../../../../../../src/features/place/hooks/usePlaces", () => ({ useUpdatePlaceVisit: () => ({ isPending: false, mutateAsync: vi.fn() }) }));
vi.mock("../../../../../../src/components/ui", () => ({
  showToast: notify,
  Button: ({ busy: _busy, variant: _variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: string }) => <button {...props} />,
}));
vi.mock("../../../../../../src/components/common/UserAvatar", () => ({ UserAvatar: () => null }));
vi.mock("../../../../../../src/features/place/components/StarRating", () => ({ StarRating: () => null }));
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

it("keeps a failed check-in removal open and lets the user retry", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const previousUser = useAuthStore.getState().user;
  useAuthStore.setState({ user: { id: "owner", username: "Owner", role: "user", status: "active", createdAt: "2026-01-01" } });
  const visit: PlaceVisit = { id: "visit", placeId: "place", placeName: "Cafe", placeAddress: "", markerIcon: "X", markerColor: "red",
    visitedAt: new Date().toISOString(), userId: "owner", username: "Owner", avatarSeed: null, note: "", rating: 3 };
  const onRemove = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
  const Dialog = ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div>;
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<MobilePlaceVisitHistory visits={[visit]} onRemove={onRemove} DialogComponent={Dialog} canEditVisits={false} />));
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="View check-in details for Cafe"]')!.click());
  await act(async () => container.querySelector<HTMLButtonElement>(".place__visit-remove")!.click());
  await act(async () => container.querySelector<HTMLButtonElement>(".place__visit-remove-confirm")!.click());
  expect(onRemove).toHaveBeenCalledTimes(1);
  expect(notify.error).toHaveBeenCalledOnce();
  expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  await act(async () => container.querySelector<HTMLButtonElement>(".place__visit-remove-confirm")!.click());
  expect(onRemove).toHaveBeenCalledTimes(2);
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  await act(async () => root.unmount());
  useAuthStore.setState({ user: previousUser });
  container.remove();
});
