---
wave: 1
depends_on: ["06-dispatch-assignment/01-PLAN.md"]
gap_closure: false
files_modified:
  - "middleware.ts"
  - "lib/auth.ts"
  - "app/(auth)/login/page.tsx"
  - "app/(app)/logout-button.tsx"
  - "README.md"
  - ".planning/REQUIREMENTS.md"
autonomous: true
---

<phase_goal>
Every visit to the app requires a valid login session. Unauthenticated users cannot reach any app page or API. Sessions do **not** persist across browser restarts — closing the browser and reopening the site must show the login screen (credentials required), even if the user never clicked **Log out**.
</phase_goal>

<problem_today>
- NextAuth JWT session uses the default **30-day** `session.maxAge`; the session cookie survives browser restarts.
- Auth is enforced per-layout (`app/(app)/layout.tsx`) but there is **no global middleware** — easier to miss a route.
- User reports opening the site and already being logged in without entering credentials.
</problem_today>

<must_haves>
- [ ] **`middleware.ts`** protects all routes except `/login`, `/api/auth/*`, and Next static assets; unauthenticated → redirect `/login`.
- [ ] Session cookie is **browser-session only** (no `Max-Age` on session token cookie) so closing the browser clears login.
- [ ] JWT `session.maxAge` capped to a single work shift (default **8 hours**) as a backstop inside an open browser.
- [ ] All order/product APIs return **401** without session (middleware + existing handler checks).
- [ ] **Log out** clears session and lands on `/login`.
- [ ] `/register` and `/signup` remain non-creatable (redirect to login); no public data pages.
- [ ] README documents session behavior (re-login after browser close; optional `SESSION_MAX_AGE_SECONDS` env).
</must_haves>

<tasks>
  <task id="1" name="middleware-global-auth">
    <step>Create `middleware.ts` at project root using `withAuth` from `next-auth/middleware` (or equivalent `getToken` check for Next.js 16 App Router).</step>
    <step>`matcher`: exclude `_next/static`, `_next/image`, `favicon.ico`, `api/auth`.</step>
    <step>Allow unauthenticated access only to `/login` (and auth callback routes).</step>
    <step>Redirect authenticated users away from `/login` to `/` (role home) — optional; still requires credentials on next browser session.</step>
  </task>

  <task id="2" name="session-cookie-hardening">
    <step>In `lib/auth.ts`, set `session.maxAge` from env `SESSION_MAX_AGE_SECONDS` (default `28800` = 8h).</step>
    <step>Configure `cookies.sessionToken.options` with `httpOnly: true`, `sameSite: "lax"`, `secure` in production, and **no `maxAge`** on the cookie so it is a session cookie (expires when browser closes).</step>
    <step>Keep `session.strategy: "jwt"`; ensure callbacks unchanged.</step>
  </task>

  <task id="3" name="login-ux">
    <step>Login form: use `autoComplete="off"` on the form (or `username` / `current-password` only as needed) so the browser does not auto-submit a stale session impression; fields start empty.</step>
    <step>After successful `signIn`, use `window.location.href` to `/` (already done).</step>
    <step>Confirm `signOut({ callbackUrl: "/login" })` in logout button (already done).</step>
  </task>

  <task id="4" name="docs">
    <step>README: explain that users must sign in on each new browser session; sessions last up to 8h while the browser stays open.</step>
    <step>REQUIREMENTS.md: Phase 07 section marked planned → complete after execution.</step>
  </task>
</tasks>

<out_of_scope>
- Re-login on **every page navigation** within the same open browser (too disruptive for warehouse use).
- MFA / password rotation UI.
- IP allowlists or device binding.
</out_of_scope>

<verification>
- Open site in private window → `/login` required.
- Log in → access `/orders` works.
- Close browser completely → reopen `http://localhost:3000` → `/login` again (not auto-logged-in).
- Hit `/api/orders` without cookie → 401 or redirect.
- `npm run build` passes.
</verification>
