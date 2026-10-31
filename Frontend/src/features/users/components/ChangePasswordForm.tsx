import { useState } from "react";
import { Collapsible } from "@animate-ui/react/primitives/base-ui/collapsible";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { useMutation } from "@tanstack/react-query";
import { Button, PasswordInput } from "../../../components/ui";
import { useLocale } from "../../../context/LocaleContext";
import { ApiError } from "../../../services/api";
import { userService } from "../services/userService";

export function ChangePasswordForm() {
  const { t } = useLocale();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const change = useMutation({
    mutationFn: () => userService.changePassword(current, password),
    onSuccess: () => { setCurrent(""); setPassword(""); setConfirm(""); },
  });

  return (
    <Collapsible.Root render={<section />} className="profile-page__card profile-password" aria-labelledby="change-password-title">
      <h2 id="change-password-title">
        <Collapsible.Trigger type="button" className="profile-password__toggle">
          {t("Change password")}<ChevronDown size={18} aria-hidden="true" />
        </Collapsible.Trigger>
      </h2>
      <Collapsible.Panel className="profile-password__panel">
      <form onSubmit={(event) => {
        event.preventDefault();
        if (password !== confirm) { setMismatch(true); return; }
        setMismatch(false);
        change.mutate();
      }}>
        <label htmlFor="current-password">{t("Current password")}</label>
        <PasswordInput id="current-password" value={current} onChange={setCurrent} autoComplete="current-password" required maxLength={128} />
        <label htmlFor="new-password">{t("New password")}</label>
        <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" required minLength={8} maxLength={128} aria-describedby="password-hint" />
        <p id="password-hint">{t("Use 8 to 128 characters.")}</p>
        <label htmlFor="confirm-new-password">{t("Confirm password")}</label>
        <PasswordInput id="confirm-new-password" value={confirm} onChange={setConfirm} autoComplete="new-password" required maxLength={128} />
        {mismatch ? <p role="alert">{t("Passwords do not match.")}</p> : null}
        {change.isError ? <p role="alert">{change.error instanceof ApiError && change.error.message === "Current password is incorrect." ? t("Current password is incorrect.") : t("Could not change password. Please try again.")}</p> : null}
        {change.isSuccess ? <p role="status">{t("Password changed.")}</p> : null}
        <Button type="submit" busy={change.isPending}>{t("Change password")}</Button>
      </form>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
