import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { useAuthStore } from "../../../store/authStore";
import type { AuthUser } from "../../auth/types";
import { userService } from "../services/userService";

export function useAvatarPicker(user: AuthUser) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [batch, setBatch] = useState(0);
  const [draft, setDraft] = useState<string | null>(null);
  const savedSeed = user.avatarSeed ?? user.id;
  const selectedSeed = draft ?? savedSeed;
  const seeds = [
    savedSeed,
    ...Array.from({ length: 8 }, (_, index) => `${user.id}:avatar:${batch}:${index}`)
      .filter((seed) => seed !== savedSeed)
      .slice(0, 7),
  ];
  const save = useMutation({
    mutationFn: userService.setAvatar,
    onMutate: () => queryClient.cancelQueries({ queryKey: ["profile", user.id] }),
    onSuccess: (updated) => {
      if (useAuthStore.getState().user?.id !== updated.id) return;
      useAuthStore.getState().updateUser(updated);
      queryClient.setQueryData(["profile", updated.id], updated);
      setDraft(null);
      showToast.success(t("Avatar saved."));
      for (const key of ["users", "admin-users", "albums", "places"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  const select = (seed: string) => { setDraft(seed); save.reset(); };
  const submit = () => {
    if (selectedSeed !== savedSeed && !save.isPending) save.mutate(selectedSeed);
  };
  return { t, batch, setBatch, savedSeed, selectedSeed, seeds, save, select, submit };
}
