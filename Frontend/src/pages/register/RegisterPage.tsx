import { useState } from "react";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { Link } from "react-router-dom";
import { authService } from "../../features/auth";
import { Button, Input } from "../../components/ui";
import { ErrorState } from "../../components/ui/Status";
import { Brand } from "../../components/layout/Brand";
import { CommunityIntro } from "../../components/layout/CommunityIntro";
import "../login/login.css";

export function RegisterPage() {
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
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      // Accounts start pending approval; the admin approves before the first sign in.
      await authService.register(username.trim(), password);
      setCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <div className="login-shell">
        <header className="login__header">
          <Brand />
          <span className="login__header-note">Your world. Your community.</span>
        </header>
        <main className="login">
          <CommunityIntro variant="login" />
          <section className="login__card" aria-labelledby="pending-title">
            <h2 id="pending-title" className="login__title">Almost there<span className="brand__dot">.</span></h2>
            <p className="login__subtitle">
              Your account is created and waiting for an admin to approve it. Come back and sign in once you have been approved.
            </p>
            <Link className="btn btn--primary login__swap" to="/login">Sign in</Link>
          </section>
        </main>
        <footer className="login__footer">
          <span>ShinigaCim</span>
          <span>Made for moments worth sharing.</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <header className="login__header">
        <Brand />
        <span className="login__header-note">Your world. Your community.</span>
      </header>
      <main className="login">
        <CommunityIntro variant="login" />
        <form className="login__card" onSubmit={submit} aria-labelledby="register-title">
          <span className="login__badge">JOIN THE COMMUNITY</span>
          <h2 id="register-title" className="login__title">Create account<span className="brand__dot">.</span></h2>
          <p className="login__subtitle">Pick a name and start sharing moments.</p>

          <label className="login__label" htmlFor="username">Username</label>
          <Input
            id="username"
            value={username}
            onChange={setUsername}
            placeholder="Username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={64}
            pattern="[a-zA-Z0-9_.\-]+"
            title="Letters, digits, '_', '.' and '-' only."
            aria-label="Username"
          />
          <label className="login__label" htmlFor="password">Password</label>
          <Input
            id="password"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            aria-label="Password"
          />
          <label className="login__label" htmlFor="confirm-password">Confirm password</label>
          <Input
            id="confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
            placeholder="Confirm password"
            autoComplete="new-password"
            required
            aria-label="Confirm password"
          />

          {error ? <ErrorState message={error} /> : null}

          <Button type="submit" busy={busy}>
            Create account <ArrowRight size={18} aria-hidden="true" />
          </Button>
          <p className="login__footnote">
            Already have an account? <Link className="login__swap" to="/login">Sign in</Link>
          </p>
        </form>
      </main>
      <footer className="login__footer">
        <span>ShinigaCim</span>
        <span>Made for moments worth sharing.</span>
      </footer>
    </div>
  );
}
