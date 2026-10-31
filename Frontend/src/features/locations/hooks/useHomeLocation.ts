import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { homeLocationService } from "../services/homeLocationService";
import type { HomeLocation } from "../types";

export const homeLocationKeys = {
  byUser: (userId: string) => ["users", userId, "home-location"] as const,
};

export function useHomeLocation(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [photosHomeLocation, setPhotosHomeLocation] = useState<HomeLocation | null>(null);
  const query = useQuery({
    queryKey: userId ? homeLocationKeys.byUser(userId) : ["users", "anonymous", "home-location"],
    queryFn: homeLocationService.get,
    enabled: !!userId,
  });
  const save = useMutation({
    onMutate: async () => {
      const previous = await homeLocationService.get();
      return { wasUnset: previous === null };
    },
    mutationFn: (location: HomeLocation) => homeLocationService.set(location),
    onSuccess: (location, _variables, context) => {
      if (userId) queryClient.setQueryData(homeLocationKeys.byUser(userId), location);
      if (context?.wasUnset) setPhotosHomeLocation(location);
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

  return {
    query, save, clear, applyToPhotos, photosHomeLocation,
    dismissPhotosConfirmation: () => setPhotosHomeLocation(null),
  };
}
