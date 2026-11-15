import { useId } from "react";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { Button } from "../../../components/ui/Button";
import { Pagination } from "../../../components/ui/Pagination";
import { ApiError } from "../../../services/api";
import type { AuthUser } from "../../auth/types";
import { useAvatarPicker } from "../hooks/useAvatarPicker";
import "./avatar-picker.css";

export function AvatarPicker({ user }: { user: AuthUser }) {
  const name = useId();
  const { t, batch, setBatch, savedSeed, selectedSeed, seeds, save, select, submit } = useAvatarPicker(user);

  return (
    <form
      className="avatar-picker"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
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
                onChange={() => select(seed)}
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
        <div className="avatar-picker__pagination">
          <Pagination page={batch + 1} pageSize={1} total={100} itemLabel="Avatar" isFetching={save.isPending} onPageChange={(page) => setBatch(page - 1)} />
        </div>
        <Button type="submit" busy={save.isPending} disabled={selectedSeed === savedSeed}>
          {t("Save avatar")}
        </Button>
      </div>
    </form>
  );
}
