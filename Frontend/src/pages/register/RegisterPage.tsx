import { useState } from "react";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { Link } from "react-router-dom";
import { authService } from "../../features/auth";
import { Button, Input } from "../../components/ui";
import { ErrorState } from "../../components/ui/Status";
import { Brand } from "../../components/layout/Brand";
import { CommunityIntro } from "../../components/layout/CommunityIntro";
import { ThemeTogglerButton } from "../../components/ui/ThemeTogglerButton";
import { LanguageToggleButton } from "../../components/ui/LanguageToggleButton";
import { useLocale } from "../../context/LocaleContext";
import "../login/login.css";

export function RegisterPage() {
  const { t } = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t("Passwords do not match."));
      return;
    }
    setBusy(true);
    try {
      // Accounts start pending approval; the admin approves before the first sign in.
      await authService.register(username.trim(), password);
      setCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Registration failed."));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <div className="login-shell">
        <header className="login__header">
          <Brand />
          <div className="login__header-actions">
            <span className="login__header-note">{t("Your world. Your community.")}</span>
            <LanguageToggleButton />
            <ThemeTogglerButton />
          </div>
        </header>
        <main className="login">
          <CommunityIntro variant="login" />
          <section className="login__card" aria-labelledby="pending-title">
            <h2 id="pending-title" className="login__title">{t("Almost there")}<span className="brand__dot">.</span></h2>
            <p className="login__subtitle">
              {t("Your account is created and waiting for an admin to approve it. Come back and sign in once you have been approved.")}
            </p>
            <Link className="btn btn--primary login__swap" to="/login">{t("Sign in")}</Link>
          </section>
        </main>
        <footer className="login__footer">
          <span>ShinigaCim</span>
          <span>{t("Made for moments worth sharing.")}</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <header className="login__header">
        <Brand />
        <div className="login__header-actions">
          <span className="login__header-note">{t("Your world. Your community.")}</span>
          <LanguageToggleButton />
          <ThemeTogglerButton />
        </div>
      </header>
      <main className="login">
        <CommunityIntro variant="login" />
        <form className="login__card" onSubmit={submit} aria-labelledby="register-title">
          <span className="login__badge">{t("JOIN THE COMMUNITY")}</span>
          <h2 id="register-title" className="login__title">{t("Create account")}<span className="brand__dot">.</span></h2>
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
          />
          <label className="login__label" htmlFor="password">{t("Password")}</label>
          <Input
            id="password"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder={t("Password")}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            aria-label={t("Password")}
          />
          <label className="login__label" htmlFor="confirm-password">{t("Confirm password")}</label>
          <Input
            id="confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
            placeholder={t("Confirm password")}
            autoComplete="new-password"
            required
            aria-label={t("Confirm password")}
          />

          {error ? <ErrorState message={error} /> : null}

          <Button type="submit" busy={busy}>
            {t("Create account")} <ArrowRight size={18} aria-hidden="true" />
          </Button>
          <p className="login__footnote">
            {t("Already have an account?")} <Link className="login__swap" to="/login">{t("Sign in")}</Link>
          </p>
        </form>
      </main>
      <footer className="login__footer">
        <span>ShinigaCim</span>
        <span>{t("Made for moments worth sharing.")}</span>
      </footer>
    </div>
  );
}
