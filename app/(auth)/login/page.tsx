"use client";

import { useEffect, useMemo, useState } from "react";
import { getSession, signIn, signOut } from "next-auth/react";

import { homePathForRole, roleFromSession } from "@/lib/roles";
import { ui } from "@/lib/ui";

export default function LoginPage() {
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    signOut({ redirect: false }).finally(() => setReady(true));
  }, []);

  const canSubmit = useMemo(() => username.trim().length > 0 && password.length > 0, [password, username]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

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
      <div className="login-form-panel min-h-dvh">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <div className="login-brand-panel">
        <div className="relative z-10 max-w-md">
          <div className={`${ui.brandMark} mb-6 h-12 w-12 text-sm`}>LS</div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Loading Sheet</h1>
          <p className="mt-3 text-base leading-relaxed text-brand-100/90">
            PO entry, production batches, dispatch loading sheets, and packaging — one connected
            workflow for Waleed Tech.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-brand-100/75">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
              Purchase orders &amp; loading sheets
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              Batch assignment &amp; ready stock
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              Packaging inventory &amp; gate delivery
            </li>
          </ul>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in with your authorized account.</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit} autoComplete="off">
            <div>
              <label className={ui.label} htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`${ui.input} mt-1.5`}
                placeholder="e.g. nouman"
              />
            </div>

            <div>
              <label className={ui.label} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${ui.input} mt-1.5`}
              />
            </div>

            {error ? <div className={ui.alertDanger}>{error}</div> : null}

            <button type="submit" disabled={!canSubmit || submitting} className={ui.btnPrimaryFull}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
