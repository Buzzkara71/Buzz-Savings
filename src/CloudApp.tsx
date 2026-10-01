import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowRight, Cloud, LockKeyhole } from "lucide-react";
import App from "./App";
import { cloudConfigError, supabase } from "./supabase";

export default function CloudApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [local, setLocal] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState(cloudConfigError);
  useEffect(() => {
    if (!supabase) return;
    let alive = true,
      observed = false;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      observed = true;
      if (!alive) return;
      setSession(next);
      setReady(true);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
      if (next) setLocal(false);
    });
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive || observed) return;
        setSession(data.session);
        setReady(true);
        if (error)
          setError(
            "Your previous session could not be restored. Please sign in again.",
          );
      })
      .catch(() => {
        if (alive) {
          setReady(true);
          setError("Could not restore your session. Please sign in again.");
        }
      });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  async function signOut() {
    const result = await supabase!.auth.signOut({ scope: "local" });
    if (result.error) throw new Error("Could not sign out. Please try again.");
    setSession(null);
    setLocal(false);
  }
  if (!ready)
    return (
      <div className="cloud-loading" role="status">
        Opening your workspace…
      </div>
    );
  if (local || (!supabase && !cloudConfigError))
    return (
      <App
        key="local"
        onSignIn={supabase ? () => setLocal(false) : undefined}
      />
    );
  if (session && !recovery)
    return <App key={session.user.id} session={session} onSignOut={signOut} />;
  return (
    <AuthScreen
      recovery={recovery && Boolean(session)}
      initialError={error}
      onRecovered={() => setRecovery(false)}
      onLocal={() => setLocal(true)}
    />
  );
}

function authMessage(message: string) {
  if (/invalid login/i.test(message)) return "Email or password is incorrect.";
  if (/email not confirmed/i.test(message))
    return "Confirm your email before signing in.";
  if (/rate limit/i.test(message))
    return "Too many attempts. Please wait a few minutes and try again.";
  if (/email|smtp|sending/i.test(message))
    return "We could not send the email. Please try again later or contact the workspace owner.";
  return "We could not complete that request. Check your details and connection, then try again.";
}

function AuthScreen({
  recovery,
  initialError,
  onRecovered,
  onLocal,
}: {
  recovery: boolean;
  initialError: string;
  onRecovered: () => void;
  onLocal: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");
  const title = recovery
    ? "Choose a new password."
    : mode === "signup"
      ? "A fresh start, together."
      : mode === "forgot"
        ? "Let’s get you back in."
        : "Your space, everywhere.";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !supabase) return;
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (recovery) {
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        onRecovered();
      } else if (mode === "signin") {
        const result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (result.error) throw result.error;
      } else if (mode === "signup") {
        const result = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (result.error) throw result.error;
        if (!result.data.session)
          setMessage(
            "Check your inbox for a confirmation link, then sign in here. If you already have an account, use Sign in.",
          );
      } else {
        const result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (result.error) throw result.error;
        setMessage(
          "If this email has an account, you’ll receive a password reset link.",
        );
      }
    } catch (reason) {
      setError(authMessage(reason instanceof Error ? reason.message : ""));
    } finally {
      setBusy(false);
    }
  }
  function switchMode(next: typeof mode) {
    setMode(next);
    setMessage("");
    setError(initialError);
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <a className="auth-brand" href="/" aria-label="Buzz home">
          <span>B</span>Buzz<span className="auth-brand-dot">.</span>
        </a>
        <div className="auth-story-copy">
          <span className="auth-eyebrow">SMALL PLANS. BIG POSSIBILITIES.</span>
          <h1>
            A little more
            <br />
            balance, wherever
            <br />
            life takes you.
          </h1>
          <p>
            Your tasks, money, and savings goals.
            <br />
            One personal space across your devices.
          </p>
        </div>
        <img
          src="/images/buzz-mascot.png"
          alt="Your cyan-haired focus buddy hugging a green plush toy"
        />
        <div className="auth-story-foot">
          <Cloud size={17} />
          Your progress comes with you.
        </div>
      </section>
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-icon">
          <LockKeyhole size={24} />
        </div>
        <span className="auth-eyebrow">WELCOME TO BUZZ</span>
        <h2 id="auth-title">{title}</h2>
        <p>
          {recovery
            ? "Use a strong password you haven’t used before."
            : "Sign in to keep your records in sync on your phone and laptop."}
        </p>
        <form className="form auth-form" onSubmit={submit}>
          <fieldset disabled={busy || !supabase}>
            {!recovery && (
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  maxLength={254}
                  autoFocus
                />
              </label>
            )}
            {(recovery || mode !== "forgot") && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "signin" && !recovery
                      ? "current-password"
                      : "new-password"
                  }
                  required
                  minLength={mode === "signin" && !recovery ? 1 : 8}
                  maxLength={128}
                  placeholder={
                    mode === "signin"
                      ? "Your password"
                      : "At least 8 characters"
                  }
                />
              </label>
            )}
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="auth-message" role="status">
                {message}
              </div>
            )}
            <button className="button primary" type="submit">
              {busy
                ? "Please wait…"
                : recovery
                  ? "Update password"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </fieldset>
        </form>
        {!supabase && (
          <p className="auth-error" role="alert">
            {initialError}
          </p>
        )}
        {!recovery && (
          <div className="auth-links">
            {mode === "signin" ? (
              <>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  disabled={busy}
                >
                  Forgot password?
                </button>
                <span>
                  New here?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    disabled={busy}
                  >
                    Create an account
                  </button>
                </span>
              </>
            ) : (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                disabled={busy}
              >
                Back to sign in
              </button>
            )}
          </div>
        )}
        {!recovery && (
          <div className="auth-local">
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={onLocal}
            >
              Continue on this device
            </button>
            <p>
              Browser data stays on this device. You can import it after signing
              in.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
