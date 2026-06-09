---
wave: 1
depends_on: []
files_modified:
  - "scripts/seed-users.ts"
  - "app/(app)/layout.tsx"
  - "app/page.tsx"
  - "app/api/orders/route.ts"
  - "app/(auth)/login/page.tsx"
  - ".planning/REQUIREMENTS.md"
  - "README.md"
autonomous: true
---

<phase_goal>
Only **four authorized people** can use the order portal: **Nouman, Javeria, Aslam, Ibtisam**. They sign in with **username + password** (no signup). Orders record **who created** them again. All other behaviour (catalog, loading sheet) stays the same.
</phase_goal>

<credentials_handout>
Share these **once** with each person; recommend changing passwords later (re-run seed with new `SEED_USERS_JSON` or edit DB).

| Person (display name) | Username   | Initial password   |
|-----------------------|------------|--------------------|
| Nouman                | `nouman`   | `Nouman-Order-01`  |
| Javeria               | `javeria`  | `Javeria-Order-02` |
| Aslam                 | `aslam`    | `Aslam-Order-03`   |
| Ibtisam               | `ibtisam`  | `Ibtisam-Order-04` |

Usernames are stored **lowercase**. Login page: `/login`.
</credentials_handout>

<must_haves>
- [ ] Default seed users in `scripts/seed-users.ts` replaced with the four rows above (still allow `SEED_USERS_JSON` override).
- [ ] `npm run seed:users` creates/updates exactly these accounts (`role: po_creator`).
- [ ] Restore **session protection**: unauthenticated users cannot access `/new-order`, `/orders/*`; `/` redirects to `/login` or `/new-order` based on session.
- [ ] Restore **credentials login UI** on `/login` (username + password, link to app after success).
- [ ] `POST /api/orders` requires session; sets `createdByUserId` + `createdByName` from session.
- [ ] App header shows signed-in name + **Logout** (reuse prior pattern).
- [ ] No self-service signup; `/signup` and `/register` keep redirecting away.
- [ ] `.env.local` must include `NEXTAUTH_SECRET` and `NEXTAUTH_URL` (document in README).
</must_haves>

<tasks>
  <task id="T1" title="Seed script — four named users">
    <steps>
      <step>Update `getSeedUsers()` default array to Nouman/Javeria/Aslam/Ibtisam with usernames/passwords from handout table.</step>
      <step>After seed, print one line: “Seeded 4 users — see README or plan for passwords” (do not log passwords in CI).</step>
    </steps>
    <verification>
      <check>`npm run seed:users` succeeds; MongoDB has 4 users with correct `name` and `username`.</check>
    </verification>
  </task>

  <task id="T2" title="Protect routes + restore login/logout">
    <steps>
      <step>`app/(app)/layout.tsx`: `auth()` + redirect to `/login` if no session; header with `session.user.name` + logout button.</step>
      <step>`app/page.tsx`: redirect logged-in users to `/new-order`, others to `/login`.</step>
      <step>`app/(auth)/login/page.tsx`: restore `signIn("credentials", …)` form (remove placeholder-only page).</step>
    </steps>
    <verification>
      <check>Logged out: `/new-order` redirects to login. Valid user reaches form.</check>
    </verification>
  </task>

  <task id="T3" title="Orders API attribution">
    <steps>
      <step>`app/api/orders/route.ts`: `auth()`; 401 if missing; set `createdByUserId` / `createdByName` on create.</step>
      <step>`lib/models/Order.ts`: ensure `createdByUserId` can be string (non-null when authenticated).</step>
    </steps>
    <verification>
      <check>POST without cookie returns 401; with session stores creator fields.</check>
    </verification>
  </task>

  <task id="T4" title="New Order client — handle 401">
    <steps>
      <step>On `POST /api/orders` response 401, redirect to `/login`.</step>
    </steps>
    <verification>
      <check>Session expiry path sends user to login.</check>
    </verification>
  </task>

  <task id="T5" title="Docs">
    <steps>
      <step>README: seed users + handout table + `NEXTAUTH_SECRET` requirement.</step>
      <step>REQUIREMENTS: Phase 03 section for portal auth.</step>
    </steps>
    <verification>
      <check>New teammate can configure env and seed without asking.</check>
    </verification>
  </task>
</tasks>

<definition_of_done>
Four named users can log in; strangers cannot create orders; created orders show creator in MongoDB; no signup flow.
</definition_of_done>
