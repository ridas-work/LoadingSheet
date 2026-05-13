"use client";

import { useEffect, useMemo, useState } from "react";
import { getSession, signIn, signOut } from "next-auth/react";

import { homePathForRole, roleFromSession } from "@/lib/roles";

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
    window.location.href = role ? homePathForRole(role) : "/orders";
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4">
        <p className="text-sm text-zinc-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-600">Authorized users only. No self-registration.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit} autoComplete="off">
          <div>
            <label className="block text-sm font-medium text-zinc-800" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              placeholder="e.g. nouman"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-800" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
