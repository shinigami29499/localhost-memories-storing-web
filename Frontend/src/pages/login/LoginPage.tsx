import { useState } from "react";
import { ArrowRight } from "@/components/animate-ui/icons/arrow-right";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../features/auth";
import { useAuthStore } from "../../store/authStore";
import { Button, Input } from "../../components/ui";
import { ErrorState } from "../../components/ui/Status";
import { Brand } from "../../components/layout/Brand";
import { CommunityIntro } from "../../components/layout/CommunityIntro";
import "./login.css";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await authService.login(username.trim(), password);
      useAuthStore.getState().setSession(session);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <header className="login__header">
        <Brand />
        <span className="login__header-note">Your world. Your community.</span>
      </header>
      <main className="login">
        <CommunityIntro variant="login" />
        <form className="login__card" onSubmit={submit} aria-labelledby="login-title">
          <span className="login__badge">LET'S CONNECT</span>
          <h2 id="login-title" className="login__title">Welcome back<span className="brand__dot">.</span></h2>
          <p className="login__subtitle">Sign in to share and browse media.</p>

        <label className="login__label" htmlFor="username">Username</label>
        <Input
          id="username"
          value={username}
          onChange={setUsername}
          placeholder="Username"
          autoComplete="username"
          required
          aria-label="Username"
        />
        <label className="login__label" htmlFor="password">Password</label>
        <Input
          id="password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          required
          aria-label="Password"
        />

        {error ? <ErrorState message={error} /> : null}

        <Button type="submit" busy={busy}>
          Sign in <ArrowRight size={18} aria-hidden="true" />
        </Button>
        <p className="login__footnote">
          New to ShinigaCim? <Link className="login__swap" to="/register">Create an account</Link>
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
