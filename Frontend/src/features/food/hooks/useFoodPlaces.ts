import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { foodPlaceService } from "../services/foodPlaceService";
import type { FoodPlace, FoodPlaceVisit, SaveFoodPlaceInput } from "../types";

export const foodPlaceKeys = {
  all: ["food-places"] as const,
  list: () => ["food-places", "list"] as const,
  visitHistory: () => ["food-places", "visit-history"] as const,
};

export function useFoodPlaces() {
  return useQuery<FoodPlace[]>({
    queryKey: foodPlaceKeys.list(),
    queryFn: () => foodPlaceService.list(),
  });
}

export function useFoodPlaceVisitHistory(enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery<FoodPlaceVisit[]>({
    queryKey: [...foodPlaceKeys.visitHistory(), userId],
    queryFn: async () => {
      if (!userId || useAuthStore.getState().user?.id !== userId)
        throw new Error("Cannot load visit history without the signed-in user.");
      let userChanged = false;
      // An in-flight request can retry under a newly signed-in account.
      const unsubscribe = useAuthStore.subscribe((state) => {
        if (state.user?.id !== userId) userChanged = true;
      });
      try {
        const visits = await foodPlaceService.visitHistory();
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

export function useCheckInFoodPlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["food-place-check-in"],
    mutationFn: (foodPlaceId: string) => foodPlaceService.checkIn(foodPlaceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: foodPlaceKeys.visitHistory() }),
  });
}

export function useDeleteFoodPlaceVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["food-place-visit-delete"],
    mutationFn: (visitId: string) => foodPlaceService.removeVisit(visitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: foodPlaceKeys.visitHistory() }),
  });
}

export function useSaveFoodPlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["food-place-save"],
    mutationFn: ({ id, input }: { id?: string; input: SaveFoodPlaceInput }) =>
      id ? foodPlaceService.update(id, input) : foodPlaceService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: foodPlaceKeys.all }),
  });
}

export function useDeleteFoodPlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["food-place-delete"],
    mutationFn: (foodPlaceId: string) => foodPlaceService.remove(foodPlaceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: foodPlaceKeys.all }),
  });
}
