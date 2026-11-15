import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Settings } from "@/components/animate-ui/icons/settings";
import { PasswordInput, showToast } from "@/components/ui";
import { LanguageToggleButton } from "@/components/ui/LanguageToggleButton";
import { useLocale } from "@/context/LocaleContext";
import { authService } from "@/features/auth";
import "./mobile-register.css";

const SettingsPage = lazy(() => import("./settings/MobileSettingsPage").then((module) => ({ default: module.SettingsPage })));

export function RegisterPage() {
  const { t } = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (settingsOpen && !settingsDialog.current?.open) settingsDialog.current?.showModal();
  }, [settingsOpen]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setConfirmError(true);
      return;
    }
    setBusy(true);
    try {
      await authService.register(username.trim(), password);
      showToast.success(t("Account created successfully"));
      setCreated(true);
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : t("Registration failed."));
    } finally {
      setBusy(false);
    }
  }

  return <main className="mobile-register">
    <header className="mobile-register__header">
      <strong>ShinigaCim<span>.</span></strong>
      <div className="mobile-register__header-actions">
        <LanguageToggleButton />
        <button ref={settingsButton} type="button" aria-label={t("Settings")} title={t("Settings")} onClick={() => setSettingsOpen(true)}><Settings size={20} aria-hidden="true" /></button>
      </div>
    </header>
    <dialog ref={settingsDialog} className="mobile-register__settings" aria-label={t("Settings")} onClose={() => { setSettingsOpen(false); settingsButton.current?.focus(); }}>
      <button type="button" className="mobile-register__settings-close" onClick={() => settingsDialog.current?.close()}>{t("Close")}</button>
      {settingsOpen && <Suspense fallback={<p role="status">{t("Loading settings")}</p>}><SettingsPage /></Suspense>}
    </dialog>
    {created ? <section className="mobile-register__content" aria-labelledby="pending-title">
      <h1 id="pending-title">{t("Almost there")}</h1>
      <p>{t("Your account is created and waiting for an admin to approve it. Come back and sign in once you have been approved.")}</p>
      <Link className="mobile-register__primary" to="/login">{t("Sign in")}</Link>
    </section> : <div className="mobile-register__content">
      <h1 id="register-title">{t("Create account")}</h1>
      <p>{t("Pick a name and start sharing moments.")}</p>
      <form onSubmit={submit} aria-labelledby="register-title">
        <label htmlFor="username">{t("Username")}</label>
        <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={t("Username")} autoComplete="username" required minLength={3} maxLength={64} pattern="[a-zA-Z0-9_.\-]+" title={t("Letters, digits, '_', '.' and '-' only.")} aria-describedby="register-username-help" />
        <p id="register-username-help" className="mobile-register__help">{t("Use 3 to 64 characters: letters, digits, '_', '.' and '-'.")}</p>
        <label htmlFor="password">{t("Password")}</label>
        <PasswordInput id="password" value={password} onChange={setPassword} placeholder={t("Password")} autoComplete="new-password" required minLength={8} maxLength={128} aria-label={t("Password")} aria-describedby="register-password-help" />
        <p id="register-password-help" className="mobile-register__help">{t("Use 8 to 128 characters.")}</p>
        <label htmlFor="confirm-password">{t("Confirm password")}</label>
        <PasswordInput id="confirm-password" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setConfirmError(false); }} placeholder={t("Confirm password")} autoComplete="new-password" required aria-label={t("Confirm password")} aria-invalid={confirmError} aria-describedby={confirmError ? "register-confirm-error" : undefined} />
        {confirmError && <p id="register-confirm-error" className="mobile-register__error" role="alert">{t("Passwords do not match.")}</p>}
        <button className="mobile-register__primary" type="submit" disabled={busy}>{t("Create account")}</button>
      </form>
      <p className="mobile-register__signin">{t("Already have an account?")} <Link to="/login">{t("Sign in")}</Link></p>
    </div>}
  </main>;
}
