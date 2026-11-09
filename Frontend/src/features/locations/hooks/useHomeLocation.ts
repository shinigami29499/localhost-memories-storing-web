import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { homeLocationService } from "../services/homeLocationService";
import type { HomeLocation } from "../types";

export const homeLocationKeys = {
  byUser: (userId: string) => ["users", userId, "home-location"] as const,
};

export function useHomeLocation(userId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: userId ? homeLocationKeys.byUser(userId) : ["users", "anonymous", "home-location"],
    queryFn: homeLocationService.get,
    enabled: !!userId,
  });
  const save = useMutation({
    mutationFn: async (location: HomeLocation) => {
      const saved = await homeLocationService.set(location);
      return homeLocationService.set(saved, true);
    },
    onSuccess: async (location) => {
      if (userId) queryClient.setQueryData(homeLocationKeys.byUser(userId), location);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["media"] }),
        queryClient.invalidateQueries({ queryKey: ["albums"] }),
      ]);
    },
  });
  const applyToPhotos = useMutation({
    mutationFn: (location: HomeLocation) => homeLocationService.set(location, true),
    onSuccess: async (location) => {
      if (userId) queryClient.setQueryData(homeLocationKeys.byUser(userId), location);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["media"] }),
        queryClient.invalidateQueries({ queryKey: ["albums"] }),
      ]);
    },
  });
  const clear = useMutation({
    mutationFn: homeLocationService.clear,
    onSuccess: () => {
      if (userId) queryClient.setQueryData(homeLocationKeys.byUser(userId), null);
    },
  });

  return { query, save, clear, applyToPhotos };
}
