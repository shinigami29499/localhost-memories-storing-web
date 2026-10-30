import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { Button } from "../../../components/ui/Button";
import { showToast } from "../../../components/ui/Toast";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { useAuthStore } from "../../../store/authStore";
import type { AuthUser } from "../../auth/types";
import { userService } from "../services/userService";
import "./avatar-picker.css";

export function AvatarPicker({ user }: { user: AuthUser }) {
  const { t } = useLocale();
  const name = useId();
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
      for (const key of ["users", "admin-users", "albums", "food-places"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  return (
    <form
      className="avatar-picker"
      onSubmit={(event) => {
        event.preventDefault();
        if (selectedSeed !== savedSeed && !save.isPending) save.mutate(selectedSeed);
      }}
    >
      <fieldset disabled={save.isPending}>
        <legend>{t("Change avatar")}</legend>
        <p>{t("Choose an avatar, then save your changes.")}</p>
        <div className="avatar-picker__options">
          {seeds.map((seed, index) => (
            <label key={seed} className="avatar-picker__option">
              <input
                type="radio"
                name={name}
                value={seed}
                checked={selectedSeed === seed}
                aria-label={index === 0 ? t("Current avatar") : t("Avatar {number}", { number: index })}
                onChange={() => {
                  setDraft(seed);
                  save.reset();
                }}
              />
              <UserAvatar user={{ id: user.id, avatarSeed: seed }} className="avatar-picker__image" />
            </label>
          ))}
        </div>
      </fieldset>
      {save.isError ? (
        <p className="avatar-picker__error" role="alert">
          {save.error instanceof ApiError ? save.error.message : t("Could not save avatar. Please try again.")}
        </p>
      ) : null}
      <div className="avatar-picker__actions">
        <Button
          type="button"
          variant="secondary"
          disabled={save.isPending}
          onClick={() => {
            setBatch((value) => value + 1);
            setDraft(null);
            save.reset();
          }}
        >
          {t("More avatars")}
        </Button>
        <Button type="submit" busy={save.isPending} disabled={selectedSeed === savedSeed}>
          {t("Save avatar")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={save.isPending || selectedSeed === savedSeed}
          onClick={() => {
            setDraft(null);
            save.reset();
          }}
        >
          {t("Cancel")}
        </Button>
      </div>
    </form>
  );
}
