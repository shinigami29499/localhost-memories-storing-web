import { useState } from "react";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../features/auth";
import { useAuthStore } from "../../store/authStore";
import { Button, Input, showToast } from "../../components/ui";
import { Brand } from "../../components/layout/Brand";
import { CommunityIntro } from "../../components/layout/CommunityIntro";
import { ThemeTogglerButton } from "../../components/ui/ThemeTogglerButton";
import { LanguageToggleButton } from "../../components/ui/LanguageToggleButton";
import { useLocale } from "../../context/LocaleContext";
import "./login.css";

export function LoginPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const session = await authService.login(username.trim(), password);
      useAuthStore.getState().setSession(session);
      showToast.success(t("Login as {username} successfully", { username: session.user.username }));
      navigate("/", { replace: true });
    } catch (err) {
      showToast.error(t("Authentication failed"), err instanceof Error ? err.message : t("Login failed."));
    } finally {
      setBusy(false);
    }
  };

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
        <form className="login__card" onSubmit={submit} aria-labelledby="login-title">
          <span className="login__badge">{t("LET'S CONNECT")}</span>
          <h2 id="login-title" className="login__title">{t("Welcome back")}<span className="brand__dot">.</span></h2>
          <p className="login__subtitle">{t("Sign in to share and browse media.")}</p>

        <label className="login__label" htmlFor="username">{t("Username")}</label>
        <Input
          id="username"
          value={username}
          onChange={setUsername}
          placeholder={t("Username")}
          autoComplete="username"
          required
          aria-label={t("Username")}
        />
        <label className="login__label" htmlFor="password">{t("Password")}</label>
        <Input
          id="password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder={t("Password")}
          autoComplete="current-password"
          required
          aria-label={t("Password")}
        />

        <Button type="submit" busy={busy}>
          {t("Sign in")} <ArrowRight size={18} aria-hidden="true" />
        </Button>
        <p className="login__footnote">
          {t("New to ShinigaCim?")} <Link className="login__swap" to="/register">{t("Create an account")}</Link>
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
