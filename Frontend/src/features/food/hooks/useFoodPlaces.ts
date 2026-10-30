import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { foodPlaceService } from "../services/foodPlaceService";
import type { FoodPlace, SaveFoodPlaceInput } from "../types";

export const foodPlaceKeys = {
  all: ["food-places"] as const,
  list: () => ["food-places", "list"] as const,
};

export function useFoodPlaces() {
  return useQuery<FoodPlace[]>({
    queryKey: foodPlaceKeys.list(),
    queryFn: () => foodPlaceService.list(),
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
