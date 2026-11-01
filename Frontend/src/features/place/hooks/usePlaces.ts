import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { placeService } from "../services/placeService";
import type { Place, PlaceVisit, SavePlaceInput } from "../types";

export const placeKeys = {
  all: ["places"] as const,
  list: () => ["places", "list"] as const,
  visitHistory: () => ["places", "visit-history"] as const,
  placeVisitHistory: (placeId: string, userId?: string) => ["places", "visit-history", placeId, userId] as const,
};

export function usePlaces() {
  return useQuery<Place[]>({
    queryKey: placeKeys.list(),
    queryFn: () => placeService.list(),
  });
}

export function usePlaceVisitHistory(enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery<PlaceVisit[]>({
    queryKey: [...placeKeys.visitHistory(), userId],
    queryFn: async () => {
      if (!userId || useAuthStore.getState().user?.id !== userId)
        throw new Error("Cannot load visit history without the signed-in user.");
      let userChanged = false;
      // An in-flight request can retry under a newly signed-in account.
      const unsubscribe = useAuthStore.subscribe((state) => {
        if (state.user?.id !== userId) userChanged = true;
      });
      try {
        const visits = await placeService.allVisitHistory();
        if (userChanged)
          throw new Error("The signed-in user changed while loading visit history.");
        return visits;
      } finally {
        unsubscribe();
      }
    },
    enabled,
  });
}

export function usePlaceVisits(placeId: string) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery<PlaceVisit[]>({
    queryKey: placeKeys.placeVisitHistory(placeId, userId),
    queryFn: async () => {
      if (!userId || useAuthStore.getState().user?.id !== userId)
        throw new Error("Cannot load visit history without the signed-in user.");
      const visits = await placeService.visitsForPlace(placeId);
      if (useAuthStore.getState().user?.id !== userId)
        throw new Error("The signed-in user changed while loading visit history.");
      return visits;
    },
    enabled: Boolean(userId && placeId),
  });
}

export function useCheckInPlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["place-place-check-in"],
    mutationFn: (placeId: string) => placeService.checkIn(placeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: placeKeys.visitHistory() });
    },
  });
}

export function useDeletePlaceVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["place-place-visit-delete"],
    mutationFn: (visitId: string) => placeService.removeVisit(visitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: placeKeys.visitHistory() }),
  });
}

export function useUpdatePlaceVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["place-place-visit-update"],
    mutationFn: ({ visitId, note, rating }: { visitId: string; note: string; rating: number }) =>
      placeService.updateVisit(visitId, { note, rating }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: placeKeys.all }),
  });
}

export function useSavePlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["place-place-save"],
    mutationFn: ({ id, input }: { id?: string; input: SavePlaceInput }) =>
      id ? placeService.update(id, input) : placeService.create(input),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: placeKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["previews"] }),
      queryClient.invalidateQueries({ queryKey: ["picker-image"] }),
    ]),
  });
}

export function useDeletePlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["place-place-delete"],
    mutationFn: (placeId: string) => placeService.remove(placeId),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: placeKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["previews"] }),
      queryClient.invalidateQueries({ queryKey: ["picker-image"] }),
    ]),
  });
}
