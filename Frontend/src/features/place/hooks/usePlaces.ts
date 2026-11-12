import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { placeService, type PlaceMapBounds } from "../services/placeService";
import type { Place, PlaceVisit, SavePlaceInput } from "../types";

export const placeKeys = {
  all: ["places"] as const,
  list: () => ["places", "list"] as const,
  map: () => ["places", "map"] as const,
  detail: (id: string) => ["places", "detail", id] as const,
  visitHistory: () => ["places", "visit-history"] as const,
  placeVisitHistory: (placeId: string, userId?: string) => ["places", "visit-history", placeId, userId] as const,
};

export function usePlaces(enabled = true) {
  return useQuery<Place[]>({
    queryKey: placeKeys.list(),
    queryFn: () => placeService.list(),
    enabled,
  });
}

export function useInfinitePlaces(enabled: boolean, search: string, minimumRating: number) {
  return useInfiniteQuery({
    queryKey: [...placeKeys.list(), "page", search.trim(), minimumRating],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => placeService.page(pageParam, 30, search, minimumRating, signal),
    getNextPageParam: (lastPage) => lastPage.page * lastPage.limit < lastPage.total
      ? lastPage.page + 1 : undefined,
    enabled,
  });
}

export function useInfinitePlaceVisitHistory(enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  return useInfiniteQuery({
    queryKey: [...placeKeys.visitHistory(), "infinite", userId],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      if (!userId || useAuthStore.getState().user?.id !== userId)
        throw new Error("Cannot load visit history without the signed-in user.");
      const visits = await placeService.visitPage(pageParam, 30, true, undefined, signal);
      if (useAuthStore.getState().user?.id !== userId)
        throw new Error("The signed-in user changed while loading visit history.");
      return visits;
    },
    getNextPageParam: (lastPage) => lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined,
    enabled: enabled && Boolean(userId),
  });
}

export function useMapPlaces(enabled = true) {
  return useQuery({ queryKey: placeKeys.map(), queryFn: () => placeService.map(), enabled });
}

export function useInfiniteMapPlaces(enabled: boolean, bounds: PlaceMapBounds) {
  return useInfiniteQuery({
    queryKey: [...placeKeys.map(), "page", bounds],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => placeService.mapPage(pageParam, bounds, signal),
    getNextPageParam: (lastPage) => lastPage.page * lastPage.limit < lastPage.total
      ? lastPage.page + 1 : undefined,
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function usePlace(id: string | null, enabled = true) {
  return useQuery({ queryKey: placeKeys.detail(id ?? ""), queryFn: () => placeService.get(id!), enabled: enabled && !!id });
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

export function usePlaceVisits(placeId: string, page = 1, limit = 5) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: [...placeKeys.placeVisitHistory(placeId, userId), page, limit],
    queryFn: async ({ signal }) => {
      if (!userId || useAuthStore.getState().user?.id !== userId)
        throw new Error("Cannot load visit history without the signed-in user.");
      const visits = await placeService.visitPage(page, limit, true, placeId, signal);
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
      queryClient.invalidateQueries({ queryKey: placeKeys.all });
    },
  });
}

export function useDeletePlaceVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["place-place-visit-delete"],
    mutationFn: (visitId: string) => placeService.removeVisit(visitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: placeKeys.all }),
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
