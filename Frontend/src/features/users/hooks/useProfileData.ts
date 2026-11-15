import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { useAlbums } from "../../albums/hooks/useAlbums";
import { mediaService } from "../../media/services/mediaService";
import { userService } from "../services/userService";

export function useProfileData() {
  const user = useAuthStore((state) => state.user);
  const profile = useQuery({ queryKey: ["profile", user?.id], queryFn: userService.profile, enabled: Boolean(user) });
  const albums = useAlbums("mine", Boolean(user));
  const mediaCounts = useQuery({ queryKey: ["profile-count", user?.id], queryFn: ({ signal }) => mediaService.ownedCounts(signal), enabled: Boolean(user) });
  useEffect(() => { if (profile.data) useAuthStore.getState().updateUser(profile.data); }, [profile.data]);
  return { user, profile, albums, mediaCounts };
}
