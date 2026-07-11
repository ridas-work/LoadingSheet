"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getSession, signIn, signOut } from "next-auth/react";

import { PORTAL_IMAGES } from "@/lib/portalTheme";
import { homePathForRole, roleFromSession } from "@/lib/roles";

const REMEMBER_USERNAME_KEY = "loadingsheet-remember-username";

function UserIcon() {
  return (
    <svg className="auth-field-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M5 20a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="auth-field-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="8" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 12h2.5l2 2v2M16 14h2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    signOut({ redirect: false }).finally(() => {
      const saved = localStorage.getItem(REMEMBER_USERNAME_KEY);
      if (saved) {
        setUsername(saved);
        setRememberMe(true);
      }
      setReady(true);
    });
  }, []);

  const canSubmit = useMemo(() => username.trim().length > 0 && password.length > 0, [password, username]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (rememberMe) {
      localStorage.setItem(REMEMBER_USERNAME_KEY, username.trim());
    } else {
      localStorage.removeItem(REMEMBER_USERNAME_KEY);
    }

    const res = await signIn("credentials", {
      username: username.trim(),
      password,
      redirect: false,
    });

    if (!res) {
      setSubmitting(false);
      setError("Login failed. Please try again.");
      return;
    }

    if (res.error) {
      setSubmitting(false);
      setError("Invalid username or password.");
      return;
    }

    const session = await getSession();
    const role = roleFromSession(session?.user as { role?: string });
    const sessionUsername = (session?.user as { username?: string })?.username;
    window.location.href = role ? homePathForRole(role, sessionUsername) : "/orders";
  }

  if (!ready) {
    return (
      <div className="auth-form-panel min-h-dvh">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-art-panel">
        <Image
          src={PORTAL_IMAGES.signup}
          alt=""
          width={720}
          height={540}
          className="auth-hero-image"
          priority
        />
      </div>

      <div className="auth-form-panel">
        <div className="auth-signin-card">
          <h1 className="auth-signin-title">Sign in</h1>

          <form className="auth-signin-form" onSubmit={onSubmit} autoComplete="off">
            <label className="auth-field-pill">
              <UserIcon />
              <input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-field-input"
                placeholder="Username"
              />
            </label>

            <label className="auth-field-pill">
              <KeyIcon />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-field-input"
                placeholder="Password"
              />
            </label>

            <label className="auth-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="auth-remember-check"
              />
              <span>Remember Me</span>
            </label>

            {error ? <div className="auth-error">{error}</div> : null}

            <button type="submit" disabled={!canSubmit || submitting} className="auth-submit-pill">
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
