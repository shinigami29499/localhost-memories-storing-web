import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "@/features/auth";
import { useAuthStore } from "@/store/authStore";
import { useLocale } from "@/context/LocaleContext";
import { showToast, PasswordInput } from "@/components/ui";
import { LanguageToggleButton } from "@/components/ui/LanguageToggleButton";

export function LoginPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => { if (sessionStorage.getItem("shinigacim-logout-toast") === "1") { sessionStorage.removeItem("shinigacim-logout-toast"); showToast.success(t("Logout successfully")); } }, [t]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try { const session = await authService.login(username.trim(), password); useAuthStore.getState().setSession(session); navigate("/", { replace: true, state: { authToast: { type: "login", username: session.user.username } } }); }
    catch (error) { showToast.error(t("Authentication failed"), error instanceof Error ? error.message : t("Login failed.")); }
    finally { pending.current = false; setBusy(false); }
  }
  return <main className="mobile-login"><header><strong>ShinigaCim<span>.</span></strong><LanguageToggleButton /></header><div className="mobile-login__content"><h1>{t("Welcome back")}</h1><p>{t("Sign in to share and browse media.")}</p><form onSubmit={submit}>
    <label htmlFor="username">{t("Username")}</label><input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
    <label htmlFor="password">{t("Password")}</label><PasswordInput id="password" autoComplete="current-password" value={password} onChange={setPassword} required aria-label={t("Password")} />
    <button type="submit" disabled={busy}>{t(busy ? "Signing in..." : "Sign in")}</button>
  </form><p className="mobile-login__signup">{t("New to ShinigaCim?")} <Link to="/register">{t("Create an account")}</Link></p></div></main>;
}
