import { useState } from "react";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { Link } from "react-router-dom";
import { authService } from "../../features/auth";
import { Button, Input, PasswordInput, showToast } from "../../components/ui";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { useLocale } from "../../context/LocaleContext";
import "../login/login.css";

export function RegisterPage() {
  const { t } = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [confirmError, setConfirmError] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setConfirmError(true);
      return;
    }
    setBusy(true);
    try {
      // Accounts start pending approval; the admin approves before the first sign in.
      await authService.register(username.trim(), password);
      showToast.success(t("Account created successfully"));
      setCreated(true);
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : t("Registration failed."));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <AuthLayout>
          <section className="login__card" aria-labelledby="pending-title">
            <h1 id="pending-title" className="login__title">{t("Almost there")}<span className="brand__dot">.</span></h1>
            <p className="login__subtitle">
              {t("Your account is created and waiting for an admin to approve it. Come back and sign in once you have been approved.")}
            </p>
            <Link className="btn btn--primary login__swap" to="/login">{t("Sign in")}</Link>
          </section>
        </AuthLayout>
    );
  }

  return (
    <AuthLayout>
        <form className="login__card" onSubmit={submit} aria-labelledby="register-title">
          <span className="login__badge">{t("JOIN THE COMMUNITY")}</span>
          <h1 id="register-title" className="login__title">{t("Create account")}<span className="brand__dot">.</span></h1>
          <p className="login__subtitle">{t("Pick a name and start sharing moments.")}</p>

          <label className="login__label" htmlFor="username">{t("Username")}</label>
          <Input
            id="username"
            value={username}
            onChange={setUsername}
            placeholder={t("Username")}
            autoComplete="username"
            required
            minLength={3}
            maxLength={64}
            pattern="[a-zA-Z0-9_.\-]+"
            title={t("Letters, digits, '_', '.' and '-' only.")}
            aria-label={t("Username")}
            aria-describedby="register-username-help"
          />
          <p id="register-username-help" className="login__field-help">{t("Use 3 to 64 characters: letters, digits, '_', '.' and '-'.")}</p>
          <label className="login__label" htmlFor="password">{t("Password")}</label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder={t("Password")}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            aria-label={t("Password")}
            aria-describedby="register-password-help"
          />
          <p id="register-password-help" className="login__field-help">{t("Use 8 to 128 characters.")}</p>
          <label className="login__label" htmlFor="confirm-password">{t("Confirm password")}</label>
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={(value) => { setConfirmPassword(value); setConfirmError(false); }}
            placeholder={t("Confirm password")}
            autoComplete="new-password"
            required
            aria-label={t("Confirm password")}
            aria-invalid={confirmError}
            aria-describedby={confirmError ? "register-confirm-error" : undefined}
          />
          {confirmError ? <p id="register-confirm-error" className="login__field-error" role="alert">{t("Passwords do not match.")}</p> : null}

          <Button type="submit" busy={busy}>
            {t("Create account")} <ArrowRight size={18} aria-hidden="true" />
          </Button>
          <p className="login__footnote">
            {t("Already have an account?")} <Link className="login__swap" to="/login">{t("Sign in")}</Link>
          </p>
        </form>
      </AuthLayout>
  );
}
