import { useId } from "react";
import { Check } from "lucide-react";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Pagination } from "@/components/ui/Pagination";
import { ApiError } from "@/services/api";
import type { AuthUser } from "@/features/auth/types";
import { useAvatarPicker } from "@/features/users/hooks/useAvatarPicker";
import { useMobileMenuAction } from "./layout/MobileMenuAction";
import "./mobile-avatar-picker.css";

const AVATAR_SET_COUNT = 100;

export function MobileAvatarPicker({ user, headingId, hintId }: { user: AuthUser; headingId: string; hintId: string }) {
  const name = useId();
  const { t, batch, setBatch, savedSeed, selectedSeed, seeds, save, select, submit } = useAvatarPicker(user);
  const hasDraft = selectedSeed !== savedSeed;
  useMobileMenuAction(t("Save avatar"), hasDraft ? submit : undefined, save.isPending);

  return (
    <div className="mobile-avatar-picker">
      <fieldset disabled={save.isPending} aria-labelledby={headingId} aria-describedby={hintId}>
        <div className="mobile-avatar-picker__options">
          {seeds.map((seed, index) => (
            <label key={seed} className="mobile-avatar-picker__option">
              <input
                type="radio"
                name={name}
                value={seed}
                checked={selectedSeed === seed}
                aria-label={index === 0 ? t("Current avatar") : t("Avatar {number}", { number: index })}
                onChange={() => select(seed)}
              />
              <UserAvatar user={index === 0 ? user : { id: user.id, avatarSeed: seed }} className="mobile-avatar-picker__image" />
              <span className="mobile-avatar-picker__check" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mobile-avatar-picker__actions">
        <Pagination
          page={batch + 1}
          pageSize={1}
          total={AVATAR_SET_COUNT}
          itemLabel="Avatar"
          arrowControls
          isFetching={save.isPending}
          onPageChange={(page) => setBatch(page - 1)}
        />

        {hasDraft && (
          <span className="mobile-avatar-picker__draft" role="img" aria-label={t("Selected avatar")}>
            <UserAvatar user={{ id: user.id, avatarSeed: selectedSeed }} className="mobile-avatar-picker__preview" />
          </span>
        )}
      </div>

      {save.isError && (
        <p className="mobile-avatar-picker__error" role="alert">
          {save.error instanceof ApiError ? save.error.message : t("Could not save avatar. Please try again.")}
        </p>
      )}
    </div>
  );
}

export function MobileAvatarPickerPlaceholder({ label }: { label: string }) {
  return (
    <div className="mobile-avatar-picker__options" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: 8 }, (_, index) => (
        <span key={index} className="mobile-avatar-picker__placeholder" aria-hidden="true">
          <span className="mobile-avatar-picker__image" />
        </span>
      ))}
    </div>
  );
}
